/**
 * Supported UI languages. English is the default and the fallback for any
 * unmatched browser language.
 */
export const SUPPORTED_LANGUAGES = ["en", "fr"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Stored language preference: "auto" detects the browser language,
 * otherwise an explicit supported language.
 */
export const LANGUAGE_VALUES = ["auto", ...SUPPORTED_LANGUAGES] as const;
export type LanguageValue = (typeof LANGUAGE_VALUES)[number];

export const DEFAULT_LANGUAGE: LanguageValue = "auto";

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return typeof value === "string" && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

export function isLanguageValue(value: unknown): value is LanguageValue {
  return typeof value === "string" && (LANGUAGE_VALUES as readonly string[]).includes(value);
}

export function parseLanguageValue(value: unknown): LanguageValue {
  return isLanguageValue(value) ? value : DEFAULT_LANGUAGE;
}

/**
 * Resolve a stored preference to a concrete language. "auto" (or an invalid
 * value) inspects the browser language list (e.g. navigator.languages) in
 * priority order: the first entry whose language part matches a supported
 * language wins; BCP-47 tags are matched on their primary subtag
 * ("fr-CA" -> "fr"). Falls back to English.
 */
export function resolveLanguage(
  preference: unknown,
  browserLanguages: readonly string[] = [],
): SupportedLanguage {
  const pref = parseLanguageValue(preference);
  if (pref !== "auto") {
    return pref;
  }
  for (const tag of browserLanguages) {
    const primary = tag.split("-")[0]?.toLowerCase();
    if (isSupportedLanguage(primary)) {
      return primary;
    }
  }
  return "en";
}
