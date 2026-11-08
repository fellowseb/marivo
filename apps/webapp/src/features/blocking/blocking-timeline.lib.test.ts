import { describe, it, expect } from "vitest";
import {
  buildInitialTracks,
  estimateLineDurationMs,
  snapMs,
  timelineDurationMs,
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
