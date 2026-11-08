import type { Cue, CueKind, Track } from "./blocking.models";
import { CUE_KIND_COLORS, CUE_KIND_ORDER } from "./blocking.models";
import { DEFAULT_WPM } from "./blocking.config";

interface LineLike {
  id: string;
  type: string;
  text: string;
  characters?: string[];
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
  let cursorMs = 0;
  for (const line of lines) {
    if (line.type !== "chartext") continue;
    const durationMs = estimateLineDurationMs(line.text);
    if (!audioTrack || durationMs <= 0) continue;
    const cue: Cue = {
      id: nextCueId(),
      trackId: audioTrack.id,
      startMs: cursorMs,
      durationMs,
      kind: "lineAudio",
      data: { lineId: line.id, characters: line.characters ?? [] },
      editable: false,
    };
    audioTrack.cues.push(cue);
    cursorMs += durationMs;
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
