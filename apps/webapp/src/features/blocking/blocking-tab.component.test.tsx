import { describe, it, expect, vi, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import BlockingTab from "./blocking-tab.component";

const lineContents = new Map([
  [
    "l1",
    { lineType: "chartext", text: "Bonjour, monsieur.", characters: ["c1"], type: "saved_version" },
  ],
  ["l2", { lineType: "chartext", text: "Bonjour.", characters: ["c2"], type: "saved_version" }],
]);

vi.mock("../script/script.context", () => ({
  useScriptContext: () => ({
    lastModifiedDate: new Date(0),
    remoteLastModifiedDate: new Date(0),
    lines: new Map([
      ["l1", { id: "l1", type: "chartext", lastModifiedDate: new Date(0) }],
      ["l2", { id: "l2", type: "chartext", lastModifiedDate: new Date(0) }],
    ]),
    lineContents,
    lineToContents: new Map(),
    linesOrder: ["l1", "l2"],
    characters: { c1: "DORANTE", c2: "CLÉON" },
    outline: [],
    dispatch: vi.fn(),
  }),
}));

describe("BlockingTab layout (issue #215)", () => {
  afterEach(() => cleanup());

  it("renders the v3 layout: speaker above, single script line, inline controls, tracks, stage viewer", () => {
    render(<BlockingTab />);
    // speaker name of the current (first) line, above the strip
    expect(screen.getByText("DORANTE")).toBeTruthy();
    // single-line script strip shows the current réplique
    expect(screen.getByText("Bonjour, monsieur.")).toBeTruthy();
    // inline play/stop/jump controls, no time slider
    expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Stop" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Jump to line" })).toBeTruthy();
    // multi-track timeline with group headers
    expect(screen.getByRole("button", { name: /Collapse Line audio/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Collapse Movements/ })).toBeTruthy();
    // stage viewer below
    expect(screen.getByText("Stage viewer")).toBeTruthy();
  });

  it("play toggles to pause and stop resets", () => {
    render(<BlockingTab />);
    const play = screen.getByRole("button", { name: "Play" });
    fireEvent.click(play);
    expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
  });

  it("play advances the playhead and changes the current line/speaker", () => {
    vi.useFakeTimers();
    try {
      render(<BlockingTab />);
      fireEvent.click(screen.getByRole("button", { name: "Play" }));
      // line 1 has 2 words (~857ms at 140wpm); after 1000ms we are on line 2
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByText("Bonjour.")).toBeTruthy();
      expect(screen.getByText("CLÉON")).toBeTruthy();
    } finally {
      vi.useRealTimers();
      cleanup();
    }
  });

  it("collapsing a track group hides its header from the expanded state", () => {
    render(<BlockingTab />);
    const header = screen.getByRole("button", { name: /Collapse Movements/ });
    fireEvent.click(header);
    expect(screen.getByRole("button", { name: /Expand Movements/ })).toBeTruthy();
  });
});
