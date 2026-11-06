import { describe, it, expect } from "vitest";
import type { Line, LineContent } from "../script/script.models";
import {
  computeImportSelectionModel,
  computeKeptLineIds,
  EMPTY_SELECTION,
} from "./import-selection.lib";

function heading(id: string, text: string, level: number): LineContent {
  return {
    id,
    lineId: id,
    type: "saved_version",
    version: 1,
    lastModifiedDate: new Date(0),
    authorUsername: "a",
    lineType: "heading",
    text,
    headingLevel: level,
  };
}

function chartext(id: string, chars: string[], text: string): LineContent {
  return {
    id,
    lineId: id,
    type: "saved_version",
    version: 1,
    lastModifiedDate: new Date(0),
    authorUsername: "a",
    lineType: "chartext",
    characters: chars,
    text,
  };
}

function freetext(id: string, text: string): LineContent {
  return {
    id,
    lineId: id,
    type: "saved_version",
    version: 1,
    lastModifiedDate: new Date(0),
    authorUsername: "a",
    lineType: "freetext",
    text,
  };
}

function makeState(order: string[], contents: Record<string, LineContent>) {
  const lines = new Map<string, Line>();
  const lineContents = new Map<string, LineContent>();
  const lineToContents = new Map();
  for (const id of order) {
    lines.set(id, { id, type: contents[id].lineType, lastModifiedDate: new Date(0) });
    lineContents.set(id, contents[id]);
    // mimic display resolution: versions list so getLineContentForDisplayWithInfo finds it
    lineToContents.set(id, { sharedDrafts: [], versions: [contents[id].id] });
  }
  return {
    lines,
    lineContents,
    lineToContents,
    linesOrder: order,
    characters: { c1: "HAMLET", c2: "OPHELIA" },
  };
}

// Act I (H1)
//   scene 1 (H2)
//     hamlet line, ophelia line
//   scene 2 (H2)
//     hamlet line
// Act II (H1)
//   freetext line
const ORDER = ["h1", "h2a", "l1", "l2", "h2b", "l3", "h1b", "l4"];
const CONTENTS: Record<string, LineContent> = {
  h1: heading("h1", "Act I", 1),
  h2a: heading("h2a", "Scene 1", 2),
  l1: chartext("l1", ["c1"], "To be"),
  l2: chartext("l2", ["c2"], "My lord"),
  h2b: heading("h2b", "Scene 2", 2),
  l3: chartext("l3", ["c1"], "Or not"),
  h1b: heading("h1b", "Act II", 1),
  l4: freetext("l4", "stage direction"),
};

describe("computeImportSelectionModel", () => {
  const model = computeImportSelectionModel(makeState(ORDER, CONTENTS));

  it("builds sections: heading inclusive to next same-or-higher level heading exclusive, with nesting", () => {
    expect(model.sections.map((s) => [s.id, s.title, s.lineIds])).toEqual([
      ["h1", "Act I", ["h1", "h2a", "l1", "l2", "h2b", "l3"]],
      ["h2a", "Scene 1", ["h2a", "l1", "l2"]],
      ["h2b", "Scene 2", ["h2b", "l3"]],
      ["h1b", "Act II", ["h1b", "l4"]],
    ]);
    // innermost sections per line; lines in nested sections also list the outer one
    expect(model.lineToSections.get("l1")).toEqual(["h1", "h2a"]);
    expect(model.lineToSections.get("h2b")).toEqual(["h1", "h2b"]);
    expect(model.lineToSections.get("l4")).toEqual(["h1b"]);
  });

  it("maps characters to their lines", () => {
    expect(model.characters).toEqual([
      { id: "c1", name: "HAMLET", lineIds: ["l1", "l3"] },
      { id: "c2", name: "OPHELIA", lineIds: ["l2"] },
    ]);
    expect(model.lineToCharacters.get("l1")).toEqual(["c1"]);
    expect(model.lineToCharacters.get("l4")).toBeUndefined();
  });
});

describe("computeKeptLineIds", () => {
  const model = computeImportSelectionModel(makeState(ORDER, CONTENTS));

  it("keeps everything with an empty selection", () => {
    expect(computeKeptLineIds(model, EMPTY_SELECTION, ORDER)).toEqual(ORDER);
  });

  it("drops a whole section (incl. nested) when the outer section is excluded", () => {
    const kept = computeKeptLineIds(
      model,
      { ...EMPTY_SELECTION, excludedSections: new Set(["h1"]) },
      ORDER,
    );
    expect(kept).toEqual(["h1b", "l4"]);
  });

  it("drops only the nested section when an inner section is excluded", () => {
    const kept = computeKeptLineIds(
      model,
      { ...EMPTY_SELECTION, excludedSections: new Set(["h2a"]) },
      ORDER,
    );
    expect(kept).toEqual(["h1", "h2b", "l3", "h1b", "l4"]);
  });

  it("drops all lines of an excluded character (when all their characters are excluded)", () => {
    const kept = computeKeptLineIds(
      model,
      { ...EMPTY_SELECTION, excludedCharacters: new Set(["c1"]) },
      ORDER,
    );
    expect(kept).toEqual(["h1", "h2a", "l2", "h2b", "h1b", "l4"]);
  });

  it("drops individually excluded lines", () => {
    const kept = computeKeptLineIds(
      model,
      { ...EMPTY_SELECTION, excludedLines: new Set(["l2"]) },
      ORDER,
    );
    expect(kept).not.toContain("l2");
    expect(kept).toHaveLength(ORDER.length - 1);
  });
});
