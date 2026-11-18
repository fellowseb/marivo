import { describe, it, expect } from "vitest";
import {
  buildInitialTracks,
  computeTimings,
  cuesInWindow,
  estimateLineDurationMs,
  generateKeyframes,
  snapMs,
  timelineDurationMs,
  visibleWindowMs,
} from "./blocking-timeline.lib";
import { CUE_KIND_ORDER, type CueKind } from "./blocking.models";

const labels = Object.fromEntries(CUE_KIND_ORDER.map((k) => [k, k])) as Record<CueKind, string>;

describe("blocking-timeline lib", () => {
  it("estimateLineDurationMs uses WPM", () => {
    expect(estimateLineDurationMs("", 140)).toBe(0);
    // 14 words at 140 wpm = 6s = 6000ms
    expect(
      estimateLineDurationMs(
        "one two three four five six seven eight nine ten eleven twelve thirteen fourteen",
        140,
      ),
    ).toBe(6000);
  });

  it("buildInitialTracks creates one track per kind and sequential read-only lineAudio cues", () => {
    const lines = [
      { id: "l1", type: "heading", text: "ACTE I" },
      { id: "l2", type: "chartext", text: "Bonjour monsieur", characters: ["c1"] },
      { id: "l3", type: "freetext", text: "une didascalie" },
      { id: "l4", type: "chartext", text: "oui", characters: ["c2"] },
    ];
    const tracks = buildInitialTracks(lines, labels);
    expect(tracks.map((t) => t.kind)).toEqual(CUE_KIND_ORDER);
    const audio = tracks.find((t) => t.kind === "lineAudio")!;
    expect(audio.cues).toHaveLength(2);
    expect(audio.cues[0].editable).toBe(false);
    expect(audio.cues[0].startMs).toBe(0);
    expect(audio.cues[1].startMs).toBe(audio.cues[0].durationMs);
    expect(audio.cues[0].data).toMatchObject({ lineId: "l2" });
  });

  it("timelineDurationMs is the end of the last cue", () => {
    const tracks = buildInitialTracks(
      [
        { id: "l1", type: "chartext", text: "a b c d e f g" }, // 7 words @140wpm
      ],
      labels,
    );
    const total = timelineDurationMs(tracks);
    expect(total).toBe(estimateLineDurationMs("a b c d e f g"));
  });

  it("snapMs snaps to the grid unless bypassed", () => {
    expect(snapMs(1234, 500, false)).toBe(1000);
    expect(snapMs(1300, 500, false)).toBe(1500);
    expect(snapMs(1234, 500, true)).toBe(1234);
  });
});

describe("windowed rendering", () => {
  it("visibleWindowMs converts scroll position to a ms window with preload margin", () => {
    // 0.05 px/ms => 1000px = 20000ms; clientWidth 500px = 10000ms; preload 5000
    const w = visibleWindowMs(1000, 500, 60000, 5000);
    expect(w.startMs).toBe(15000);
    expect(w.endMs).toBe(35000);
    // clamped at the end
    const w2 = visibleWindowMs(3000, 500, 60000, 5000);
    expect(w2.endMs).toBe(60000);
  });

  it("cuesInWindow keeps only intersecting cues", () => {
    const track = {
      id: "t",
      kind: "movement" as const,
      label: "m",
      color: "#fff",
      collapsed: false,
      cues: [
        {
          id: "c1",
          trackId: "t",
          startMs: 0,
          durationMs: 1000,
          kind: "movement" as const,
          editable: true,
        },
        {
          id: "c2",
          trackId: "t",
          startMs: 5000,
          durationMs: 1000,
          kind: "movement" as const,
          editable: true,
        },
        {
          id: "c3",
          trackId: "t",
          startMs: 9500,
          durationMs: 1000,
          kind: "movement" as const,
          editable: true,
        },
      ],
    };
    const inWindow = cuesInWindow(track, 4000, 10000).map((c) => c.id);
    expect(inWindow).toEqual(["c2", "c3"]); // c3 overlaps the end edge
  });
});

describe("keyframe generation & timing (#209)", () => {
  it("generateKeyframes: one keyframe per chartext line start, non-spoken lines skipped", () => {
    const kfs = generateKeyframes([
      { id: "l1", type: "heading", text: "ACTE I" },
      { id: "l2", type: "chartext", text: "Bonjour monsieur" },
      { id: "l3", type: "freetext", text: "didascalie" },
      { id: "l4", type: "chartext", text: "oui" },
    ]);
    expect(kfs.map((k) => [k.lineId, k.kind, k.wordOffset])).toEqual([
      ["l2", "lineStart", 0],
      ["l4", "lineStart", 0],
    ]);
    expect(kfs.every((k) => k.startMs === 0 && k.durationMs === 0)).toBe(true);
  });

  it("generateKeyframes: empty script yields no keyframes", () => {
    expect(generateKeyframes([])).toEqual([]);
  });

  it("generateKeyframes: long lines (>15 words) split into intra-line keyframes on punctuation", () => {
    // 20 words with punctuation after words 5, 10, 15
    const text =
      "un deux trois quatre cinq, six sept huit neuf dix; onze douze treize quatorze quinze. seize dix-sept dix-huit dix-neuf vingt";
    const kfs = generateKeyframes([{ id: "l1", type: "chartext", text }]);
    expect(kfs).toHaveLength(4);
    expect(kfs.map((k) => k.kind)).toEqual(["lineStart", "intraLine", "intraLine", "intraLine"]);
    // word offsets are cumulative: 0, 5, 10, 15
    expect(kfs.map((k) => k.wordOffset)).toEqual([0, 5, 10, 15]);
    // segment word counts sum to the total 20
    expect(kfs.reduce((sum, k) => sum + k.segmentWords, 0)).toBe(20);
  });

  it("generateKeyframes: long line without punctuation stays a single keyframe", () => {
    const text = Array.from({ length: 20 }, (_, i) => `w${i}`).join(" ");
    const kfs = generateKeyframes([{ id: "l1", type: "chartext", text }]);
    expect(kfs).toHaveLength(1);
    expect(kfs[0].segmentWords).toBe(20);
  });

  it("computeTimings: WPM math lays segments out sequentially", () => {
    const kfs = generateKeyframes([
      { id: "l1", type: "chartext", text: "one two three four five six seven" }, // 7 words
      { id: "l2", type: "chartext", text: "eight nine ten" }, // 3 words
    ]);
    const tl = computeTimings(kfs, { wpm: 140 });
    // 7 words @140wpm = 3000ms, 3 words = 1286ms (rounded)
    expect(tl.keyframes[0]).toMatchObject({ startMs: 0, durationMs: 3000 });
    expect(tl.keyframes[1]).toMatchObject({
      startMs: 3000,
      durationMs: Math.round((3 / 140) * 60000),
    });
    expect(tl.totalDurationMs).toBe(3000 + Math.round((3 / 140) * 60000));
  });

  it("computeTimings: manual overrides pin duration and shift subsequent keyframes", () => {
    const kfs = generateKeyframes([
      { id: "l1", type: "chartext", text: "one two three four" },
      { id: "l2", type: "chartext", text: "five six" },
    ]);
    const tl = computeTimings(kfs, {
      wpm: 140,
      overrides: { "kf-l1-0": { durationMs: 10_000 } },
    });
    expect(tl.keyframes[0].durationMs).toBe(10_000);
    expect(tl.keyframes[1].startMs).toBe(10_000);
    // an explicit startMs override pins the keyframe
    const tl2 = computeTimings(kfs, {
      wpm: 140,
      overrides: { "kf-l2-0": { startMs: 60_000 } },
    });
    expect(tl2.keyframes[1].startMs).toBe(60_000);
    expect(tl2.totalDurationMs).toBe(60_000 + tl2.keyframes[1].durationMs);
  });

  it("computeTimings: empty input gives an empty timeline", () => {
    expect(computeTimings([])).toEqual({ keyframes: [], totalDurationMs: 0 });
  });

  it("buildInitialTracks times lineAudio cues via the keyframe timeline", () => {
    const tracks = buildInitialTracks(
      [
        { id: "l1", type: "chartext", text: "one two three four five six seven" }, // 3000ms
        { id: "l2", type: "chartext", text: "eight nine ten" },
      ],
      labels,
    );
    const audio = tracks.find((t) => t.kind === "lineAudio")!;
    expect(audio.cues[0]).toMatchObject({ startMs: 0, durationMs: 3000, editable: false });
    expect(audio.cues[1].startMs).toBe(3000);
  });
});
