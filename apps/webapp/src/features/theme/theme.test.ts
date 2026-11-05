import { describe, it, expect, beforeEach } from "vitest";
import {
  DEFAULT_THEME,
  applyTheme,
  readStoredTheme,
  storeTheme,
  THEME_OPTIONS,
  THEME_STORAGE_KEY,
} from "./theme.ts";

describe("theme helpers", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-mode");
  });

  it("exposes all 30 named themes", () => {
    expect(THEME_OPTIONS).toHaveLength(30);
    expect(THEME_OPTIONS[0].name).toBe("sable");
    expect(THEME_OPTIONS.map((option) => option.name)).toContain("dracula");
  });

  it("applies a theme to the document element", () => {
    applyTheme("foret-dark");
    expect(document.documentElement.dataset.theme).toBe("foret");
    expect(document.documentElement.dataset.mode).toBe("dark");
  });

  it("stores and reads back a theme", () => {
    storeTheme("ocean-light");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("ocean-light");
    expect(readStoredTheme()).toBe("ocean-light");
  });

  it("falls back to the default theme for unknown stored values", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "not-a-theme");
    expect(readStoredTheme()).toBe(DEFAULT_THEME);
  });

  it("falls back to the default theme when storage is unavailable", () => {
    const original = window.localStorage.getItem;
    window.localStorage.getItem = () => {
      throw new Error("storage unavailable");
    };
    expect(readStoredTheme()).toBe(DEFAULT_THEME);
    window.localStorage.getItem = original;
  });

  it("does not throw when storing fails", () => {
    const original = window.localStorage.setItem;
    window.localStorage.setItem = () => {
      throw new Error("storage unavailable");
    };
    expect(() => storeTheme("sable-dark")).not.toThrow();
    window.localStorage.setItem = original;
  });
});
