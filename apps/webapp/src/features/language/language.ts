import {
  DEFAULT_LANGUAGE,
  parseLanguageValue,
  resolveLanguage,
  type LanguageValue,
  type SupportedLanguage,
} from "@marivo/utils";
import i18n, { browserLanguages, LANGUAGE_STORAGE_KEY } from "../../i18n/i18n.ts";

export function readStoredLanguage(): LanguageValue {
  try {
    return parseLanguageValue(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function storeLanguage(preference: LanguageValue): void {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, preference);
  } catch {
    // storage unavailable (private mode etc.): the choice stays session-only
  }
}

/** Resolve a stored preference ("auto" | "en" | "fr") to a concrete language. */
export function resolveStoredLanguage(preference: LanguageValue): SupportedLanguage {
  return resolveLanguage(preference, browserLanguages());
}

/** Apply a preference to i18next (resolving "auto" against the browser). */
export function applyLanguage(preference: LanguageValue): SupportedLanguage {
  const resolved = resolveStoredLanguage(preference);
  void i18n.changeLanguage(resolved);
  return resolved;
}

export { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY };
export type { LanguageValue, SupportedLanguage };
