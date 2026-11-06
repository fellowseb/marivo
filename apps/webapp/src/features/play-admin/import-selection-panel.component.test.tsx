import { describe, it, expect, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ImportSelectionPanel } from "./import-selection-panel.component";
import {
  computeImportSelectionModel,
  EMPTY_SELECTION,
  computeKeptLineIds,
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

function makeModel() {
  const order = ["h0", "l1"];
  const contents: Record<string, LineContent> = {
    h0: heading("h0", "Title (level 0)", 0),
    l1: {
      id: "l1",
      lineId: "l1",
      type: "saved_version",
      version: 1,
      lastModifiedDate: new Date(0),
      authorUsername: "a",
      lineType: "freetext",
      text: "text",
    } as LineContent,
  };
  const lines = new Map<string, Line>(
    order.map((id) => [id, { id, type: contents[id].lineType, lastModifiedDate: new Date(0) }]),
  );
  const lineContents = new Map(Object.entries(contents));
  const lineToContents = new Map(
    order.map((id) => [id, { sharedDrafts: [], versions: [contents[id].id] }]),
  );
  return computeImportSelectionModel({
    lines,
    lineContents,
    lineToContents,
    linesOrder: order,
    characters: {},
  });
}

describe("ImportSelectionPanel", () => {
  afterEach(() => cleanup());

  it("renders a level-0 heading section without crashing (repeat(-1) regression)", () => {
    const model = makeModel();
    render(
      <ImportSelectionPanel
        model={model}
        selection={EMPTY_SELECTION}
        onChange={() => {}}
        keptCount={2}
        totalCount={2}
      />,
    );
    expect(screen.getByText("Title (level 0)")).toBeTruthy();
  });

  it("unchecking a section excludes its lines from the kept set", () => {
    const model = makeModel();
    let selection = EMPTY_SELECTION;
    const { rerender } = render(
      <ImportSelectionPanel
        model={model}
        selection={selection}
        onChange={(s) => {
          selection = s;
        }}
        keptCount={2}
        totalCount={2}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox"));
    rerender(
      <ImportSelectionPanel
        model={model}
        selection={selection}
        onChange={(s) => {
          selection = s;
        }}
        keptCount={0}
        totalCount={2}
      />,
    );
    expect(computeKeptLineIds(model, selection, ["h0", "l1"])).toEqual([]);
  });
});
