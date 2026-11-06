/**
 * Theme registry. Each theme defines only base hues for its light and dark
 * variants; all CSS color tokens are derived from these in
 * `apps/webapp/src/index.css` (see DESIGN_SYSTEM.md).
 *
 * Palettes are sourced from well-known open palettes (Nord, Gruvbox,
 * Solarized, Dracula, Catppuccin, Tokyo Night, One Dark, Ayu, Everforest,
 * Rosé Pine, Kanagawa, …) and hand-picked Coolors-style schemes. Dark
 * variants use a brand-tinted near-black base (never pure #000) and light
 * text/accent values for readability.
 */

export interface ThemeHues {
  /** brand/primary (text + brand) */
  brand: string;
  /** accent (highlights, active states) */
  accent: string;
  /** warm tint (page background tint) */
  warm: string;
  /** page surface in light mode */
  cream: string;
  /** secondary accent (badges) */
  brown: string;
}

export interface ThemePalette {
  name: string;
  label: string;
  description: string;
  light: ThemeHues;
  dark: ThemeHues & { darkBase: string };
}

export const THEME_PALETTES: readonly ThemePalette[] = [
  {
    name: "sable",
    label: "Sable",
    description: "Warm parchment tones (default)",
    light: {
      brand: "#1f313c",
      accent: "#e8ce7d",
      warm: "#e4d6bc",
      cream: "#fef8eb",
      brown: "#8a6d3b",
    },
    dark: {
      brand: "#8ba3b0",
      accent: "#d9bd6f",
      warm: "#3a4148",
      cream: "#0c0f12",
      brown: "#b08a52",
      darkBase: "#0c0f12",
    },
  },
  {
    name: "foret",
    label: "Forêt",
    description: "Deep woodland greens",
    light: {
      brand: "#1f3c2b",
      accent: "#aae87d",
      warm: "#cde4bc",
      cream: "#f3feeb",
      brown: "#5c8a3b",
    },
    dark: {
      brand: "#8fb89a",
      accent: "#a4d67c",
      warm: "#33402f",
      cream: "#0b120e",
      brown: "#8fae7e",
      darkBase: "#0b120e",
    },
  },
  {
    name: "ocean",
    label: "Océan",
    description: "Cool seaside blues",
    light: {
      brand: "#1f2d3c",
      accent: "#7dc4e8",
      warm: "#bcd7e4",
      cream: "#ebf8fe",
      brown: "#3b708a",
    },
    dark: {
      brand: "#8aa5bd",
      accent: "#6fb8e0",
      warm: "#2e3d4a",
      cream: "#0b0f12",
      brown: "#6f93a8",
      darkBase: "#0b0f12",
    },
  },
  {
    name: "nord",
    label: "Nord",
    description: "Arctic, north-bluish palette (nordtheme.com)",
    light: {
      brand: "#2e3440",
      accent: "#5e81ac",
      warm: "#d8dee9",
      cream: "#eceff4",
      brown: "#8f6d5a",
    },
    dark: {
      brand: "#d8dee9",
      accent: "#88c0d0",
      warm: "#3b4252",
      cream: "#2e3440",
      brown: "#b48ead",
      darkBase: "#2e3440",
    },
  },
  {
    name: "gruvbox",
    label: "Gruvbox",
    description: "Retro warm groovy palette (gruvbox)",
    light: {
      brand: "#3c3836",
      accent: "#b57614",
      warm: "#ebdbb2",
      cream: "#fbf1c7",
      brown: "#8a5a2b",
    },
    dark: {
      brand: "#ebdbb2",
      accent: "#fe8019",
      warm: "#504945",
      cream: "#282828",
      brown: "#d5a06a",
      darkBase: "#282828",
    },
  },
  {
    name: "solarized",
    label: "Solarized",
    description: "Precision colors for machines and people (altercation/solarized)",
    light: {
      brand: "#586e75",
      accent: "#b58900",
      warm: "#eee8d5",
      cream: "#fdf6e3",
      brown: "#8a6d3b",
    },
    dark: {
      brand: "#93a1a1",
      accent: "#b58900",
      warm: "#073642",
      cream: "#002b36",
      brown: "#9a8a5f",
      darkBase: "#002b36",
    },
  },
  {
    name: "dracula",
    label: "Dracula",
    description: "Vivid purple-on-charcoal (draculatheme.com)",
    light: {
      brand: "#44475a",
      accent: "#9580ff",
      warm: "#e9e9f5",
      cream: "#f8f8f2",
      brown: "#8a6d8f",
    },
    dark: {
      brand: "#f8f8f2",
      accent: "#bd93f9",
      warm: "#44475a",
      cream: "#282a36",
      brown: "#ff79c6",
      darkBase: "#282a36",
    },
  },
  {
    name: "catppuccin",
    label: "Catppuccin",
    description: "Soft pastel Latte/Mocha (catppuccin.com)",
    light: {
      brand: "#4c4f69",
      accent: "#8839ef",
      warm: "#ccd0da",
      cream: "#eff1f5",
      brown: "#9a7b6d",
    },
    dark: {
      brand: "#cdd6f4",
      accent: "#cba6f7",
      warm: "#313244",
      cream: "#1e1e2e",
      brown: "#b0a0c8",
      darkBase: "#1e1e2e",
    },
  },
  {
    name: "tokyonight",
    label: "Tokyo Night",
    description: "Moody blue night city (folke/tokyonight)",
    light: {
      brand: "#343b58",
      accent: "#34548a",
      warm: "#d5d7e0",
      cream: "#e1e2e7",
      brown: "#8a6d5a",
    },
    dark: {
      brand: "#c0caf5",
      accent: "#7aa2f7",
      warm: "#24283b",
      cream: "#1a1b26",
      brown: "#9a8ab8",
      darkBase: "#1a1b26",
    },
  },
  {
    name: "onedark",
    label: "One Dark",
    description: "Atom's iconic dark, with a light companion",
    light: {
      brand: "#383a42",
      accent: "#4f5666",
      warm: "#d7dae0",
      cream: "#fafafa",
      brown: "#986848",
    },
    dark: {
      brand: "#abb2bf",
      accent: "#61afef",
      warm: "#3e4452",
      cream: "#282c34",
      brown: "#c08a5a",
      darkBase: "#282c34",
    },
  },
  {
    name: "ayu",
    label: "Ayu",
    description: "Simple, elegant, calm (ayu theme)",
    light: {
      brand: "#5c6773",
      accent: "#f29718",
      warm: "#e6e6eb",
      cream: "#fafafa",
      brown: "#a37a48",
    },
    dark: {
      brand: "#e6e9ef",
      accent: "#ffb454",
      warm: "#232834",
      cream: "#191e2a",
      brown: "#c8a06a",
      darkBase: "#191e2a",
    },
  },
  {
    name: "everforest",
    label: "Everforest",
    description: "Comfortable green forest (sainnhe/everforest)",
    light: {
      brand: "#5c6a72",
      accent: "#7f9c3f",
      warm: "#e8e2c8",
      cream: "#fffbef",
      brown: "#8a7a4a",
    },
    dark: {
      brand: "#d3c6aa",
      accent: "#a7c080",
      warm: "#3d484d",
      cream: "#2d353b",
      brown: "#b5a06a",
      darkBase: "#2d353b",
    },
  },
  {
    name: "rosepine",
    label: "Rosé Pine",
    description: "Dawn/Main soft rose (rosepinetheme.com)",
    light: {
      brand: "#575279",
      accent: "#907aa9",
      warm: "#f2e9e1",
      cream: "#fffaf3",
      brown: "#9a7a6d",
    },
    dark: {
      brand: "#e0def4",
      accent: "#c4a7e7",
      warm: "#26233a",
      cream: "#191724",
      brown: "#b8a0c8",
      darkBase: "#191724",
    },
  },
  {
    name: "kanagawa",
    label: "Kanagawa",
    description: "Japanese wave painting tones (rebelot/kanagawa)",
    light: {
      brand: "#545c7e",
      accent: "#766e6b",
      warm: "#e5ddc0",
      cream: "#f2ecbc",
      brown: "#8a7a5a",
    },
    dark: {
      brand: "#dcd7ba",
      accent: "#c0a36e",
      warm: "#2a2a37",
      cream: "#1f1f28",
      brown: "#b0986a",
      darkBase: "#1f1f28",
    },
  },
  {
    name: "palenight",
    label: "Palenight",
    description: "Material palenight blue (material palenight)",
    light: {
      brand: "#4e5579",
      accent: "#6b7fd7",
      warm: "#e4e7f2",
      cream: "#f5f6fa",
      brown: "#8a6d7a",
    },
    dark: {
      brand: "#c3cbe4",
      accent: "#82aaff",
      warm: "#3e4358",
      cream: "#292d3e",
      brown: "#a8a0c8",
      darkBase: "#292d3e",
    },
  },
  {
    name: "horizon",
    label: "Horizon",
    description: "Warm dusk gradient (gethorizon)",
    light: {
      brand: "#2e303e",
      accent: "#da5c7e",
      warm: "#f0d8d4",
      cream: "#fdf0ed",
      brown: "#a06a5a",
    },
    dark: {
      brand: "#cbced3",
      accent: "#e95678",
      warm: "#2a2d3a",
      cream: "#1c1e26",
      brown: "#d08a8a",
      darkBase: "#1c1e26",
    },
  },
  {
    name: "nightowl",
    label: "Night Owl",
    description: "Deep blue for late-night coding (hihayk/nightowl)",
    light: {
      brand: "#403f53",
      accent: "#4876d6",
      warm: "#e3e3ee",
      cream: "#fbfbfb",
      brown: "#8a6d9a",
    },
    dark: {
      brand: "#d6deeb",
      accent: "#7e9cd8",
      warm: "#0b2239",
      cream: "#011627",
      brown: "#9a8ac8",
      darkBase: "#011627",
    },
  },
  {
    name: "monokai",
    label: "Monokai",
    description: "Classic warm dark with pop accent (monokai.pro)",
    light: {
      brand: "#4a4a42",
      accent: "#c29a3b",
      warm: "#ece9dc",
      cream: "#f9f9f5",
      brown: "#8a6d3b",
    },
    dark: {
      brand: "#f8f8f2",
      accent: "#ae81ff",
      warm: "#3e3d32",
      cream: "#272822",
      brown: "#c8a06a",
      darkBase: "#272822",
    },
  },
  {
    name: "github",
    label: "GitHub",
    description: "GitHub light / dimmed dark",
    light: {
      brand: "#24292f",
      accent: "#0969da",
      warm: "#eaeef2",
      cream: "#ffffff",
      brown: "#8a6d4a",
    },
    dark: {
      brand: "#e6edf3",
      accent: "#58a6ff",
      warm: "#161b22",
      cream: "#0d1117",
      brown: "#bb9a6a",
      darkBase: "#0d1117",
    },
  },
  {
    name: "material",
    label: "Material",
    description: "Material 3 baseline purple",
    light: {
      brand: "#4f378b",
      accent: "#6750a4",
      warm: "#e8e0e9",
      cream: "#fef7ff",
      brown: "#7d5a50",
    },
    dark: {
      brand: "#d0bcff",
      accent: "#b39ddb",
      warm: "#1d1b20",
      cream: "#141218",
      brown: "#c8a898",
      darkBase: "#141218",
    },
  },
  {
    name: "lavender",
    label: "Lavender",
    description: "Soft pastel lavender",
    light: {
      brand: "#4a4e69",
      accent: "#9a8c98",
      warm: "#c9ada7",
      cream: "#f2e9e4",
      brown: "#8a6d7a",
    },
    dark: {
      brand: "#c9ada7",
      accent: "#b5a7e0",
      warm: "#2e2e45",
      cream: "#22223b",
      brown: "#b09ab8",
      darkBase: "#22223b",
    },
  },
  {
    name: "sunset",
    label: "Sunset",
    description: "Warm orange-pink dusk",
    light: {
      brand: "#5b2a41",
      accent: "#e36414",
      warm: "#f4d8c8",
      cream: "#fff4ec",
      brown: "#9a5a4a",
    },
    dark: {
      brand: "#ffb4a2",
      accent: "#e5989b",
      warm: "#3d2631",
      cream: "#2b1b26",
      brown: "#d08a8a",
      darkBase: "#2b1b26",
    },
  },
  {
    name: "mist",
    label: "Forest Mist",
    description: "Cool green-grey mist",
    light: {
      brand: "#2f4538",
      accent: "#74a12e",
      warm: "#dce8d5",
      cream: "#f4f9f0",
      brown: "#7a7a5a",
    },
    dark: {
      brand: "#c5d5c0",
      accent: "#a3b18a",
      warm: "#1f2d24",
      cream: "#16211a",
      brown: "#a8b090",
      darkBase: "#16211a",
    },
  },
  {
    name: "desert",
    label: "Desert",
    description: "Sandy earth tones",
    light: {
      brand: "#6d4c2f",
      accent: "#d9a441",
      warm: "#ead9c2",
      cream: "#faf3e7",
      brown: "#8a6d3b",
    },
    dark: {
      brand: "#e3c9a8",
      accent: "#d9a441",
      warm: "#3a2f24",
      cream: "#2b2118",
      brown: "#c0a06a",
      darkBase: "#2b2118",
    },
  },
  {
    name: "arctic",
    label: "Arctic",
    description: "Icy pale blue",
    light: {
      brand: "#2c4a6e",
      accent: "#4f9cf9",
      warm: "#d9e8f5",
      cream: "#f5fafd",
      brown: "#6a7a8a",
    },
    dark: {
      brand: "#cfe3f5",
      accent: "#6cb2f5",
      warm: "#1a2a3a",
      cream: "#101c28",
      brown: "#90a8bd",
      darkBase: "#101c28",
    },
  },
  {
    name: "cherry",
    label: "Cherry",
    description: "Soft pink blossom",
    light: {
      brand: "#6e2b3f",
      accent: "#e0507a",
      warm: "#f6dde3",
      cream: "#fdf1f4",
      brown: "#9a5a6a",
    },
    dark: {
      brand: "#f3c6d3",
      accent: "#ef7ba0",
      warm: "#3a1e2c",
      cream: "#2a1520",
      brown: "#d08aa0",
      darkBase: "#2a1520",
    },
  },
  {
    name: "mint",
    label: "Mint",
    description: "Fresh cool mint",
    light: {
      brand: "#1f5f4b",
      accent: "#2fa37c",
      warm: "#d9efe6",
      cream: "#f2fbf7",
      brown: "#5a8a7a",
    },
    dark: {
      brand: "#c9efe0",
      accent: "#4cc38a",
      warm: "#16302a",
      cream: "#0f231c",
      brown: "#8ac0a8",
      darkBase: "#0f231c",
    },
  },
  {
    name: "amber",
    label: "Amber",
    description: "Warm honey amber",
    light: {
      brand: "#5c4a1f",
      accent: "#d97706",
      warm: "#f5e8cf",
      cream: "#fffaf0",
      brown: "#8a6d3b",
    },
    dark: {
      brand: "#f0d9a8",
      accent: "#f0a832",
      warm: "#2e2513",
      cream: "#221a0d",
      brown: "#c8a05a",
      darkBase: "#221a0d",
    },
  },
  {
    name: "slate",
    label: "Slate",
    description: "Neutral blue-grey slate",
    light: {
      brand: "#334155",
      accent: "#64748b",
      warm: "#e2e8f0",
      cream: "#f8fafc",
      brown: "#7a6a5a",
    },
    dark: {
      brand: "#e2e8f0",
      accent: "#94a3b8",
      warm: "#1e293b",
      cream: "#0f172a",
      brown: "#b0a08a",
      darkBase: "#0f172a",
    },
  },
  {
    name: "berry",
    label: "Berry",
    description: "Rich magenta berry",
    light: {
      brand: "#5b2a86",
      accent: "#c026d3",
      warm: "#ecd9f5",
      cream: "#fdf4ff",
      brown: "#8a5a9a",
    },
    dark: {
      brand: "#e9c6fb",
      accent: "#d946ef",
      warm: "#3b1650",
      cream: "#2a0f3a",
      brown: "#c090d8",
      darkBase: "#2a0f3a",
    },
  },
] as const;

export const THEME_NAMES = THEME_PALETTES.map((palette) => palette.name) as [
  ThemePalette["name"],
  ...ThemePalette["name"][],
];
export type ThemeName = (typeof THEME_NAMES)[number];

export const THEME_MODES = ["light", "dark"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

export const THEME_VALUES = THEME_PALETTES.flatMap((palette) =>
  THEME_MODES.map((mode) => `${palette.name}-${mode}`),
) as unknown as [string, ...string[]];
export type ThemeValue = (typeof THEME_VALUES)[number];

export const DEFAULT_THEME: ThemeValue = "sable-light";

export function isThemeValue(value: unknown): value is ThemeValue {
  return typeof value === "string" && (THEME_VALUES as readonly string[]).includes(value);
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
