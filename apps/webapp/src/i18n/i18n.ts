import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { parseLanguageValue, resolveLanguage, type SupportedLanguage } from "@marivo/utils";
import enCommon from "./locales/en/common.json";
import enLayout from "./locales/en/layout.json";
import enPlays from "./locales/en/plays.json";
import enNewPlay from "./locales/en/newPlay.json";
import enCollection from "./locales/en/collection.json";
import enScript from "./locales/en/script.json";
import enSettings from "./locales/en/settings.json";
import enAccount from "./locales/en/account.json";
import enNotifications from "./locales/en/notifications.json";
import enErrors from "./locales/en/errors.json";
import frCommon from "./locales/fr/common.json";
import frLayout from "./locales/fr/layout.json";
import frPlays from "./locales/fr/plays.json";
import frNewPlay from "./locales/fr/newPlay.json";
import frCollection from "./locales/fr/collection.json";
import frScript from "./locales/fr/script.json";
import frSettings from "./locales/fr/settings.json";
import frAccount from "./locales/fr/account.json";
import frNotifications from "./locales/fr/notifications.json";
import frErrors from "./locales/fr/errors.json";

export const LANGUAGE_STORAGE_KEY = "marivo-language";

export const NAMESPACES = [
  "common",
  "layout",
  "plays",
  "newPlay",
  "collection",
  "script",
  "settings",
  "account",
  "notifications",
  "errors",
] as const;

export type Namespace = (typeof NAMESPACES)[number];

export const resources = {
  en: {
    common: enCommon,
    layout: enLayout,
    plays: enPlays,
    newPlay: enNewPlay,
    collection: enCollection,
    script: enScript,
    settings: enSettings,
    account: enAccount,
    notifications: enNotifications,
    errors: enErrors,
  },
  fr: {
    common: frCommon,
    layout: frLayout,
    plays: frPlays,
    newPlay: frNewPlay,
    collection: frCollection,
    script: frScript,
    settings: frSettings,
    account: frAccount,
    notifications: frNotifications,
    errors: frErrors,
  },
} as const;

// Type-safe translation keys: autocompleted from the English dictionaries.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: (typeof resources)["en"];
  }
}

/** Browser language list in priority order (BCP-47 tags). */
export function browserLanguages(): string[] {
  const nav = typeof navigator === "undefined" ? undefined : navigator;
  const list = [...(nav?.languages ?? []), ...(nav?.language ? [nav.language] : [])];
  return list.filter((tag): tag is string => typeof tag === "string" && tag.length > 0);
}

/** The language to use on first paint, before any server preference is known. */
export function detectInitialLanguage(): SupportedLanguage {
  let stored: unknown = null;
  try {
    stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    // storage unavailable: fall through to auto detection
  }
  return resolveLanguage(parseLanguageValue(stored), browserLanguages());
}

i18n.use(initReactI18next).init({
  resources,
  lng: detectInitialLanguage(),
  fallbackLng: "en",
  defaultNS: "common",
  ns: NAMESPACES,
  interpolation: { escapeValue: false }, // React already escapes
  returnNull: false,
  react: { useSuspense: false },
});

// Keep <html lang> in sync with the resolved language.
i18n.on("languageChanged", (lng) => {
  if (typeof document !== "undefined") {
    document.documentElement.lang = lng;
  }
});

export default i18n;
