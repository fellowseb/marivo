import { describe, it, expect, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ImportSelectionPanel } from "./import-selection-panel.component";
import {
  computeImportSelectionModel,
  computeKeptLineIds,
  EMPTY_SELECTION,
  type ImportSelection,
} from "./import-selection.lib";
import type { Line, LineContent } from "../script/script.models";

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

// Title (level 0), Act I (level 1) with two hamlet lines
const ORDER = ["h0", "h1", "l1", "l2"];
const CONTENTS: Record<string, LineContent> = {
  h0: heading("h0", "Hamlet (level 0)", 0),
  h1: heading("h1", "Act I", 1),
  l1: chartext("l1", ["c1"], "To be"),
  l2: chartext("l2", ["c1"], "Or not"),
};

function makeModel() {
  const lines = new Map<string, Line>(
    ORDER.map((id) => [id, { id, type: CONTENTS[id].lineType, lastModifiedDate: new Date(0) }]),
  );
  const lineContents = new Map(Object.entries(CONTENTS));
  const lineToContents = new Map(
    ORDER.map((id) => [id, { sharedDrafts: [], versions: [CONTENTS[id].id] }]),
  );
  return computeImportSelectionModel({
    lines,
    lineContents,
    lineToContents,
    linesOrder: ORDER,
    characters: { c1: "HAMLET" },
  });
}

function renderPanel(selection: ImportSelection, selectedLineIds: Set<string>) {
  let current = selection;
  const model = makeModel();
  const utils = render(
    <ImportSelectionPanel
      model={model}
      selection={current}
      onChange={(s) => {
        current = s;
      }}
      keptCount={computeKeptLineIds(model, current, ORDER).length}
      totalCount={ORDER.length}
      selectedLineIds={selectedLineIds}
      onClose={() => {}}
    />,
  );
  return { ...utils, getSelection: () => current, model };
}

describe("ImportSelectionPanel", () => {
  afterEach(() => cleanup());

  it("renders a level-0 part without crashing (repeat(-1) regression) and shows Included/Excluded sections", () => {
    renderPanel(EMPTY_SELECTION, new Set());
    expect(screen.getByText("Import selection")).toBeTruthy();
    expect(screen.getByText(/Hamlet \(level 0\)/)).toBeTruthy();
    expect(screen.getByText(/Act I/)).toBeTruthy();
    expect(screen.getByText("Included")).toBeTruthy();
    expect(screen.getByText(/Excluded \(0\)/)).toBeTruthy();
    expect(screen.getByText("HAMLET")).toBeTruthy();
  });

  it("unchecking a part excludes its lines from the kept set", () => {
    const { getSelection, model } = renderPanel(EMPTY_SELECTION, new Set());
    // first checkbox is the first part (h0)
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(computeKeptLineIds(model, getSelection(), ORDER)).toEqual([]);
  });

  it("shows Exclude from import for selected lines and moves them to the Excluded list", () => {
    const { getSelection, model } = renderPanel(EMPTY_SELECTION, new Set(["l1"]));
    fireEvent.click(screen.getByRole("button", { name: /Exclude from import/ }));
    const selection = getSelection();
    expect(selection.excludedLines.has("l1")).toBe(true);
    expect(computeKeptLineIds(model, selection, ORDER)).toEqual(["h0", "h1", "l2"]);
  });

  it("shows Include into import when all selected lines are excluded", () => {
    const selection: ImportSelection = {
      ...EMPTY_SELECTION,
      excludedLines: new Set(["l1"]),
    };
    const { getSelection, model } = renderPanel(selection, new Set(["l1"]));
    fireEvent.click(screen.getByRole("button", { name: /Include into import/ }));
    expect(computeKeptLineIds(model, getSelection(), ORDER)).toEqual(ORDER);
  });
});
