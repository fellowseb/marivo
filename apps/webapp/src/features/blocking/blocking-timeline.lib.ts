import type { Cue, CueKind, Keyframe, Timeline, Track } from "./blocking.models";
import { CUE_KIND_COLORS, CUE_KIND_ORDER } from "./blocking.models";
import { DEFAULT_WPM, TIMELINE_PX_PER_MS } from "./blocking.config";

interface LineLike {
  id: string;
  type: string;
  text: string;
  characters?: string[];
}

/** Lines longer than this get intra-line keyframes split on punctuation (#209). */
export const LONG_LINE_WORD_THRESHOLD = 15;

const PUNCTUATION_END = /[.,;:!?—…]["'”’]?$/;

/**
 * Split a long line into word segments at punctuation boundaries.
 * Returns one segment for short lines or lines without punctuation.
 */
function splitLineSegments(text: string): { wordOffset: number; words: number }[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= LONG_LINE_WORD_THRESHOLD) {
    return [{ wordOffset: 0, words: words.length }];
  }
  const segments: { wordOffset: number; words: number }[] = [];
  let offset = 0;
  let count = 0;
  for (const word of words) {
    count += 1;
    if (PUNCTUATION_END.test(word)) {
      segments.push({ wordOffset: offset, words: count });
      offset += count;
      count = 0;
    }
  }
  if (count > 0) segments.push({ wordOffset: offset, words: count });
  // no punctuation found: keep a single segment (no intra-line keyframes)
  if (segments.length <= 1) return [{ wordOffset: 0, words: words.length }];
  return segments;
}

/**
 * Generate keyframes from script lines (#209): one keyframe per chartext
 * line start, plus intra-line keyframes for lines longer than
 * LONG_LINE_WORD_THRESHOLD words, split on punctuation. Timings are not
 * resolved yet (startMs/durationMs = 0) — see computeTimings.
 */
export function generateKeyframes(lines: LineLike[]): Keyframe[] {
  const keyframes: Keyframe[] = [];
  let seq = 0;
  for (const line of lines) {
    if (line.type !== "chartext") continue;
    const segments = splitLineSegments(line.text);
    segments.forEach((seg, index) => {
      keyframes.push({
        id: `kf-${line.id}-${index}`,
        lineId: line.id,
        index,
        wordOffset: seg.wordOffset,
        segmentWords: seg.words,
        kind: index === 0 ? "lineStart" : "intraLine",
        startMs: 0,
        durationMs: 0,
      });
      seq += 1;
    });
  }
  return keyframes;
}

export interface TimingOverride {
  startMs?: number;
  durationMs?: number;
}

/**
 * Resolve keyframe timings (#209): each segment lasts segmentWords / wpm,
 * laid out sequentially; manual overrides pin a keyframe's startMs and/or
 * durationMs. Returns the timeline with resolved startMs/durationMs.
 */
export function computeTimings(
  keyframes: Keyframe[],
  opts: { wpm?: number; overrides?: Record<string, TimingOverride> } = {},
): Timeline {
  const wpm = opts.wpm ?? DEFAULT_WPM;
  let cursor = 0;
  const resolved = keyframes.map((kf) => {
    const override = opts.overrides?.[kf.id];
    const durationMs = override?.durationMs ?? Math.round((kf.segmentWords / wpm) * 60 * 1000);
    const startMs = override?.startMs ?? cursor;
    cursor = startMs + durationMs;
    return { ...kf, startMs, durationMs };
  });
  return { keyframes: resolved, totalDurationMs: cursor };
}

/** Build a timeline from script lines: generate keyframes + resolve timings. */
export function buildTimeline(
  lines: LineLike[],
  opts: { wpm?: number; overrides?: Record<string, TimingOverride> } = {},
): Timeline {
  return computeTimings(generateKeyframes(lines), opts);
}

/** Duration estimate of a line from its word count (WPM-based). */
export function estimateLineDurationMs(text: string, wpm: number = DEFAULT_WPM): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words === 0) return 0;
  return Math.round((words / wpm) * 60 * 1000);
}

let cueSeq = 0;
function nextCueId(): string {
  cueSeq += 1;
  return `cue-${cueSeq}`;
}

/**
 * Build the initial track list for a script: one track per cue kind (in
 * wireframe order), with read-only `lineAudio` cues generated from the
 * spoken (chartext) lines, laid out sequentially in ms.
 */
export function buildInitialTracks(lines: LineLike[], labels: Record<CueKind, string>): Track[] {
  const tracks: Track[] = CUE_KIND_ORDER.map((kind) => ({
    id: `track-${kind}`,
    kind,
    label: labels[kind],
    color: CUE_KIND_COLORS[kind],
    collapsed: false,
    cues: [],
  }));
  const audioTrack = tracks.find((t) => t.kind === "lineAudio");
  if (!audioTrack) return tracks;
  // one read-only lineAudio cue per chartext line, timed via keyframes (#209)
  const timeline = buildTimeline(lines);
  const byLine = new Map<string, { startMs: number; durationMs: number }>();
  for (const kf of timeline.keyframes) {
    const acc = byLine.get(kf.lineId) ?? { startMs: kf.startMs, durationMs: 0 };
    acc.durationMs += kf.durationMs;
    if (kf.kind === "lineStart") acc.startMs = kf.startMs;
    byLine.set(kf.lineId, acc);
  }
  for (const line of lines) {
    if (line.type !== "chartext") continue;
    const timing = byLine.get(line.id);
    if (!timing || timing.durationMs <= 0) continue;
    audioTrack.cues.push({
      id: nextCueId(),
      trackId: audioTrack.id,
      startMs: timing.startMs,
      durationMs: timing.durationMs,
      kind: "lineAudio",
      data: { lineId: line.id, characters: line.characters ?? [] },
      editable: false,
    });
  }
  return tracks;
}

/** Total timeline duration in ms (end of the last cue). */
export function timelineDurationMs(tracks: Track[]): number {
  return tracks.reduce(
    (max, track) => Math.max(max, ...track.cues.map((cue) => cue.startMs + cue.durationMs), 0),
    0,
  );
}

/** Snap a ms value to the grid, unless bypassed. */
export function snapMs(valueMs: number, gridMs: number, bypass: boolean): number {
  if (bypass || gridMs <= 0) return Math.round(valueMs);
  return Math.round(valueMs / gridMs) * gridMs;
}

/**
 * Visible time window from a horizontal scroll position, expanded by the
 * preload margin on both sides. Used to render only what's near the viewport.
 */
export function visibleWindowMs(
  scrollLeftPx: number,
  clientWidthPx: number,
  totalMs: number,
  preloadMs: number,
): { startMs: number; endMs: number } {
  const startMs = Math.max(0, scrollLeftPx / TIMELINE_PX_PER_MS - preloadMs);
  const endMs = Math.min(totalMs, (scrollLeftPx + clientWidthPx) / TIMELINE_PX_PER_MS + preloadMs);
  return { startMs, endMs };
}

/** Cues of a track intersecting [startMs, endMs]. */
export function cuesInWindow(track: Track, startMs: number, endMs: number): Cue[] {
  return track.cues.filter((cue) => cue.startMs < endMs && cue.startMs + cue.durationMs > startMs);
}
