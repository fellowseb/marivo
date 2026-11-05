export const THEME_NAMES = ["sable", "foret", "ocean"] as const;
export type ThemeName = (typeof THEME_NAMES)[number];

export const THEME_MODES = ["light", "dark"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

export const THEME_VALUES = [
  "sable-light",
  "sable-dark",
  "foret-light",
  "foret-dark",
  "ocean-light",
  "ocean-dark",
] as const;
export type ThemeValue = (typeof THEME_VALUES)[number];

export const DEFAULT_THEME: ThemeValue = "sable-light";

export function isThemeValue(value: unknown): value is ThemeValue {
  return (
    typeof value === "string" &&
    (THEME_VALUES as readonly string[]).includes(value)
  );
}

export function parseThemeValue(value: unknown): ThemeValue {
  return isThemeValue(value) ? value : DEFAULT_THEME;
}

export function getThemeName(value: ThemeValue): ThemeName {
  return value.split("-")[0] as ThemeName;
}

export function getThemeMode(value: ThemeValue): ThemeMode {
  return value.split("-")[1] as ThemeMode;
}

export function makeThemeValue(name: ThemeName, mode: ThemeMode): ThemeValue {
  return `${name}-${mode}` as ThemeValue;
}
