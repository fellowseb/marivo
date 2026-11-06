import type { Line, LineContent } from "../script/script.models";
import type { LineContents } from "../script/script-state";
import { getLineContentForDisplayWithInfo } from "../script/script.utils";

/**
 * A section: all lines from a heading (inclusive) to the next heading of the
 * same or higher level (exclusive). Deeper headings nest inside.
 */
export interface ImportSection {
  /** The heading line id. */
  id: string;
  title: string;
  headingLevel: number;
  lineIds: string[];
}

export interface ImportCharacter {
  id: string;
  name: string;
  lineIds: string[];
}

export interface ImportSelectionModel {
  sections: ImportSection[];
  /** lineId -> ids of all enclosing sections, outermost first (empty before the first heading). */
  lineToSections: Map<string, string[]>;
  characters: ImportCharacter[];
  lineToCharacters: Map<string, string[]>;
  /** lineId -> display text (for the line-level list). */
  lineTitles: Map<string, string>;
}

interface ScriptStateLike {
  lines: Map<string, Line>;
  lineContents: Map<string, LineContent>;
  lineToContents: Map<string, LineContents>;
  linesOrder: string[];
  characters: { [id: string]: string };
}

/**
 * Derived mapping from the script-state model: sections (heading ranges) and
 * character parts per line. Pure — recompute (memoized) when the script state
 * changes.
 */
export function computeImportSelectionModel(state: ScriptStateLike): ImportSelectionModel {
  const display = new Map<string, LineContent>();
  for (const lineId of state.linesOrder) {
    const line = state.lines.get(lineId);
    if (!line) {
      continue;
    }
    const [content] = getLineContentForDisplayWithInfo(
      line,
      state.lineContents,
      state.lineToContents,
    );
    display.set(lineId, content);
  }

  const sections: ImportSection[] = [];
  const lineToSections = new Map<string, string[]>();
  const stack: ImportSection[] = [];
  for (const lineId of state.linesOrder) {
    const content = display.get(lineId);
    if (!content) {
      continue;
    }
    if (content.lineType === "heading") {
      // a heading closes enclosing sections of the same or higher level
      while (stack.length > 0 && stack[stack.length - 1].headingLevel >= content.headingLevel) {
        stack.pop();
      }
      const section: ImportSection = {
        id: lineId,
        title: content.text,
        headingLevel: content.headingLevel,
        lineIds: [],
      };
      sections.push(section);
      stack.push(section);
    }
    for (const section of stack) {
      section.lineIds.push(lineId);
    }
    if (stack.length > 0) {
      lineToSections.set(
        lineId,
        stack.map((s) => s.id),
      );
    }
  }

  const lineTitles = new Map<string, string>();
  for (const [lineId, content] of display) {
    lineTitles.set(lineId, content.text);
  }

  const characters: ImportCharacter[] = [];
  const lineToCharacters = new Map<string, string[]>();
  const byId = new Map<string, ImportCharacter>();
  for (const lineId of state.linesOrder) {
    const content = display.get(lineId);
    if (!content || content.lineType !== "chartext") {
      continue;
    }
    lineToCharacters.set(lineId, content.characters);
    for (const charId of content.characters) {
      let entry = byId.get(charId);
      if (!entry) {
        entry = { id: charId, name: state.characters[charId] ?? charId, lineIds: [] };
        byId.set(charId, entry);
        characters.push(entry);
      }
      entry.lineIds.push(lineId);
    }
  }

  return { sections, lineToSections, characters, lineToCharacters, lineTitles };
}

/** User selection; empty sets = everything selected. */
export interface ImportSelection {
  excludedSections: Set<string>;
  excludedCharacters: Set<string>;
  excludedLines: Set<string>;
}

export const EMPTY_SELECTION: ImportSelection = {
  excludedSections: new Set(),
  excludedCharacters: new Set(),
  excludedLines: new Set(),
};

/**
 * A line is kept iff it is not individually excluded, none of its enclosing
 * sections is excluded, and it has no character or at least one of its
 * characters is not excluded.
 */
export function computeKeptLineIds(
  model: ImportSelectionModel,
  selection: ImportSelection,
  allLineIds: string[],
): string[] {
  return allLineIds.filter((lineId) => {
    if (selection.excludedLines.has(lineId)) {
      return false;
    }
    const sectionIds = model.lineToSections.get(lineId) ?? [];
    if (sectionIds.some((s) => selection.excludedSections.has(s))) {
      return false;
    }
    const chars = model.lineToCharacters.get(lineId) ?? [];
    if (chars.length > 0 && chars.every((c) => selection.excludedCharacters.has(c))) {
      return false;
    }
    return true;
  });
}
