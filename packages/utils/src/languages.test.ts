import { describe, it, expect } from "vitest";
import {
  DEFAULT_LANGUAGE,
  isLanguageValue,
  isSupportedLanguage,
  parseLanguageValue,
  resolveLanguage,
} from "./languages.ts";

describe("languages", () => {
  it("isSupportedLanguage / isLanguageValue", () => {
    expect(isSupportedLanguage("en")).toBe(true);
    expect(isSupportedLanguage("fr")).toBe(true);
    expect(isSupportedLanguage("de")).toBe(false);
    expect(isLanguageValue("auto")).toBe(true);
    expect(isLanguageValue("fr")).toBe(true);
    expect(isLanguageValue("de")).toBe(false);
    expect(isLanguageValue(undefined)).toBe(false);
  });

  it("parseLanguageValue falls back to auto", () => {
    expect(parseLanguageValue("fr")).toBe("fr");
    expect(parseLanguageValue("nope")).toBe(DEFAULT_LANGUAGE);
    expect(parseLanguageValue(null)).toBe("auto");
  });

  it("resolveLanguage returns explicit preferences as-is", () => {
    expect(resolveLanguage("fr", ["en-US"])).toBe("fr");
    expect(resolveLanguage("en", ["fr-FR"])).toBe("en");
  });

  it("resolveLanguage auto-detects from the browser language list in priority order", () => {
    expect(resolveLanguage("auto", ["fr-FR", "en-US"])).toBe("fr");
    expect(resolveLanguage("auto", ["de-DE", "fr-CA"])).toBe("fr");
    expect(resolveLanguage("auto", ["en-GB"])).toBe("en");
    expect(resolveLanguage("auto", ["de-DE", "es-ES"])).toBe("en"); // unsupported -> default
    expect(resolveLanguage("auto", [])).toBe("en");
    expect(resolveLanguage(undefined, ["fr"])).toBe("fr"); // invalid pref treated as auto
  });
});
