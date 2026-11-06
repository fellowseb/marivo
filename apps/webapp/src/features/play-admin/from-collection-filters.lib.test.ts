import { describe, it, expect } from "vitest";
import {
  EMPTY_FILTERS,
  countSetControls,
  sectionHasValue,
  toApiFilters,
  type FiltersState,
} from "./from-collection-filters.lib";

describe("collection filters lib", () => {
  it("sectionHasValue: text trimmed, arrays non-empty, toggles on", () => {
    expect(sectionHasValue("title", { ...EMPTY_FILTERS, title: "  " })).toBe(false);
    expect(sectionHasValue("title", { ...EMPTY_FILTERS, title: "ham" })).toBe(true);
    expect(sectionHasValue("languages", EMPTY_FILTERS)).toBe(false);
    expect(sectionHasValue("languages", { ...EMPTY_FILTERS, languages: ["fr"] })).toBe(true);
    expect(sectionHasValue("bookmarked", EMPTY_FILTERS)).toBe(false);
    expect(sectionHasValue("bookmarked", { ...EMPTY_FILTERS, bookmarkedOnly: true })).toBe(true);
  });

  it("countSetControls counts set controls only", () => {
    expect(countSetControls(EMPTY_FILTERS)).toBe(0);
    const f: FiltersState = {
      ...EMPTY_FILTERS,
      title: "hamlet",
      languages: ["en"],
      bookmarkedOnly: true,
    };
    expect(countSetControls(f)).toBe(3);
  });

  it("toApiFilters sends values when set, regardless of section open state", () => {
    const f: FiltersState = {
      ...EMPTY_FILTERS,
      title: "hamlet",
      roles: ["3", "10+"],
      bookmarkedOnly: true,
      // sections collapsed: values must still be sent
      openSections: {},
    };
    const api = toApiFilters(f);
    expect(api.title).toBe("hamlet");
    expect(api.minRoles).toBe(3);
    expect(api.maxRoles).toBeUndefined(); // "10+" = no max
    expect(api.bookmarkedOnly).toBe(true);
    expect(api.author).toBeUndefined();
    expect(toApiFilters(EMPTY_FILTERS).title).toBeUndefined();
  });
});
