import {
  DEFAULT_THEME,
  getThemeMode,
  getThemeName,
  makeThemeValue,
  parseThemeValue,
  THEME_MODES,
  THEME_NAMES,
  type ThemeMode,
  type ThemeName,
  type ThemeValue,
} from "@marivo/utils";

export const THEME_STORAGE_KEY = "marivo-theme";

export interface ThemeOption {
  name: ThemeName;
  label: string;
  description: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    name: "sable",
    label: "Sable",
    description: "Warm parchment tones (default)",
  },
  {
    name: "foret",
    label: "Forêt",
    description: "Deep woodland greens",
  },
  {
    name: "ocean",
    label: "Océan",
    description: "Cool seaside blues",
  },
];

export function getThemeOption(name: ThemeName): ThemeOption {
  const option = THEME_OPTIONS.find((candidate) => candidate.name === name);
  if (!option) {
    throw new Error(`Unknown theme name: ${name}`);
  }
  return option;
}

export function applyTheme(theme: ThemeValue): void {
  document.documentElement.dataset.theme = getThemeName(theme);
  document.documentElement.dataset.mode = getThemeMode(theme);
}

export function readStoredTheme(): ThemeValue {
  try {
    return parseThemeValue(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME;
  }
}

export function storeTheme(theme: ThemeValue): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // storage unavailable (private mode etc.): the theme stays session-only
  }
}

export { DEFAULT_THEME, makeThemeValue, THEME_MODES, THEME_NAMES };
export type { ThemeMode, ThemeName, ThemeValue };
