# Marivo Webapp Design System

This document describes the design token layer for the webapp (`apps/webapp`). All tokens are defined once in the `:root` block of `apps/webapp/src/index.css` and consumed everywhere else through `var(--token)` — component CSS modules and inline styles must not hardcode raw values.

A guard test (`apps/webapp/src/design-tokens.test.ts`) enforces this: it fails when a CSS file outside `index.css` contains a hardcoded hex color or references an undefined token.

## Theming architecture

Color tokens are **derived, not hand-specified**. Each theme defines only a handful of base hues (`--t-brand`, `--t-accent`, `--t-warm`, `--t-cream`, `--t-brown`, `--t-danger`, `--t-success`, `--t-info`, `--t-pink`, `--t-sky`); every `--color-*` token is computed from them with `color-mix(in oklch, …)` (OKLCH is perceptually uniform, unlike HSL lightness). Alpha variants are `color-mix(in oklch, var(--color-x) N%, transparent)`.

- **Light themes** (`:root` = Sable, `[data-theme="foret"]`, `[data-theme="ocean"]`) only override the `--t-*` base hues; all `--color-*` tokens follow automatically.
- **Dark mode** is a single `[data-mode="dark"]` block that remaps the semantic tokens once for every theme: surfaces become a brand-tinted near-black base (`#0c0f12` + brand) with elevation expressed as white overlays; text becomes a white alpha ramp (`0.87` / `0.6` / `0.45`, never pure white); accents are desaturated and lightened; status hues keep their hue but lighten. Never use pure `#000` for surfaces in dark mode.
- To add a theme: add a `ThemePalette` entry in `packages/utils/src/themes.ts` (light + dark base hues), then regenerate the CSS blocks in `index.css` from it. Dark mode comes for free via the shared remap.
- 30 themes ship out of the box (Sable, Forêt, Océan, Nord, Gruvbox, Solarized, Dracula, Catppuccin, Tokyo Night, One Dark, Ayu, Everforest, Rosé Pine, Kanagawa, Palenight, Horizon, Night Owl, Monokai, GitHub, Material, Lavender, Sunset, Forest Mist, Desert, Arctic, Cherry, Mint, Amber, Slate, Berry) — each with a light and a dark variant.
- The token tables below show the **Sable light** render for reference; other themes/mode derive their values as described above.

## Color tokens

### Primary

| Token | Value | Usage |
| --- | --- | --- |
| `--color-primary` | `#1f313c` | Dark petrol blue: main brand color, text, headers, buttons |
| `--color-primary-a07` … `--color-primary-a80` | `#1f313c11` … `#1f313ccc` | Primary with alpha steps (07/10/13/33/47/60/80), used for overlays, hover states, borders |

### Gold accent

| Token | Value | Usage |
| --- | --- | --- |
| `--color-gold` | `#e8ce7d` | Gold accent: highlights, active states |
| `--color-gold-a13`, `--color-gold-a60` | `#e8ce7d22`, `#e8ce7d99` | Gold with alpha, for glows and subtle fills |

### Sand / beige scale

| Token | Value |
| --- | --- |
| `--color-sand` | `#e4d6bc` |
| `--color-sand-a00` / `a20` / `a40` / `a60` | `#e4d6bc00` / `#e4d6bc33` / `#e4d6bc66` / `#e4d6bc99` |
| `--color-sand-soft` | `#e9dec9` |
| `--color-sand-dim` | `#dccdab` |
| `--color-sand-deep` | `#d8c69f` |
| `--color-sand-dark` | `#cebc96` |
| `--color-highlight` | `#ebcf96` |

### Cream surfaces

| Token | Value | Usage |
| --- | --- | --- |
| `--color-cream` | `#fef8eb` | Page background |
| `--color-cream-alt` | `#f9f1e2` | Alternate surface |
| `--color-cream-dark` | `#f3ead6` | Elevated surface |
| `--color-cream-dim` | `#efeadf` | Muted surface |
| `--color-cream-deep` | `#ece2cc` | Deepest cream surface |
| `--color-linen` | `#e8e4da` | Linen border / surface |

### Neutrals

| Token | Value | Usage |
| --- | --- | --- |
| `--color-white` (+ `a13`/`a20`/`a33`/`a60` alpha steps) | `#ffffff` | Pure white and translucent whites |
| `--color-warm-white` (+ `a53`) | `#fefefe` | Warm near-white |
| `--color-black` | `#000000` | Pure black |
| `--color-transparent` | `#0000` | Fully transparent |
| `--color-ink` (+ `a07`) | `#333333` | Dark text |
| `--color-gray` | `#666666` | Medium gray text |
| `--color-gray-light` (+ `a08`) | `#999999` | Light gray text, placeholders |
| `--color-gray-border` (+ `a40`) | `#cccccc` | Light borders |
| `--color-gray-muted` | `#bbbbbb` | Muted gray |
| `--color-gray-bg` | `#eeeeee` | Gray background |

### Brown accents

| Token | Value |
| --- | --- |
| `--color-brown` | `#8a6d3b` |
| `--color-brown-a13`, `--color-brown-a20` | `#7b520022`, `#7b520033` |

### Status colors

| Token | Value | Usage |
| --- | --- | --- |
| `--color-danger` / `--color-danger-dark` / `--color-danger-bg` | `#f43d3d` / `#c62828` / `#ffebee` | Errors, destructive actions |
| `--color-success` / `--color-success-bg` | `#2e7d32` / `#e8f5e9` | Success states |
| `--color-info` / `--color-info-bg` | `#1976d2` / `#e3f2fd` | Informational states |
| `--color-error` | `#b00020` | Error text (inline alerts) |
| `--color-pink` / `--color-pink-light-a27` | `#d63384` / `#ffb6c144` | Pink accents |
| `--color-sky` / `--color-sky-a27` | `#60c5ea` / `#60c5ea44` | Sky blue accents |

## Typography tokens

| Token | Value |
| --- | --- |
| `--font-size-xs` | `0.7rem` |
| `--font-size-sm` | `0.8rem` |
| `--font-size-md` | `0.85rem` |
| `--font-size-base` | `1rem` |
| `--font-size-lg` | `1.2rem` |
| `--font-size-xl` | `1.35rem` |
| `--font-size-2xl` | `1.5rem` |
| `--font-size-3xl` | `2rem` |
| `--font-size-hero` | `3rem` |

The base font family (`Arimo`) and weight are set on `body` in `index.css`.

## Border radius tokens

| Token | Value |
| --- | --- |
| `--radius-xs` | `2px` |
| `--radius-sm` | `4px` |
| `--radius-md` | `6px` |
| `--radius-lg` | `8px` |
| `--radius-xl` | `10px` |
| `--radius-2xl` | `12px` |
| `--radius-pill` | `40px` |

## Shadow tokens

| Token | Value |
| --- | --- |
| `--shadow-sm` | `2px 2px 2px var(--color-sand)` |
| `--shadow-md` | `4px 4px 2px var(--color-gray)` |
| `--shadow-lg` | `6px 15px 2px var(--color-sand)` |
| `--shadow-inset-left` | `-4px 0 8px rgba(0, 0, 0, 0.15)` |

## Conventions

- Never hardcode hex colors, font sizes, radii, or shadows in `*.module.css` files or inline styles — use the tokens above.
- Component-local custom properties (e.g. `--button-height`, `--toggle-diameter`) are allowed for component-internal calculations; they must derive their colors from the global tokens.
- New colors should reuse an existing token when possible. If a genuinely new color is needed, add it as a `--t-*` base hue (preferred) or a derived `--color-*` token in the `:root` block of `index.css` (the single source of truth) and document it here.
- New themes only set `--t-*` hues in a `[data-theme="name"]` block — do not re-specify `--color-*` per theme or per mode.

## Theming

Every color goes through a CSS custom property, so themes are declared as token overrides on the document element — no component CSS changes. Two attributes drive theming:

- `data-theme` — the palette: `sable` (default), `foret` or `ocean`
- `data-mode` — the variant: `light` (default) or `dark`

The `:root` block in `index.css` is the **Sable light** theme (the historical default). Five override blocks follow it:

| Selector | Theme |
| --- | --- |
| `[data-theme="foret"]` | Forêt light |
| `[data-theme="ocean"]` | Océan light |
| `[data-mode="dark"]` | Sable dark |
| `[data-theme="foret"][data-mode="dark"]` | Forêt dark |
| `[data-theme="ocean"][data-mode="dark"]` | Océan dark |

### The three themes

| Theme | Value | Description |
| --- | --- | --- |
| **Sable** | `sable-light` / `sable-dark` | Warm parchment tones (default) |
| **Forêt** | `foret-light` / `foret-dark` | Deep woodland greens |
| **Océan** | `ocean-light` / `ocean-dark` | Cool seaside blues |

Each override block redefines the full color token set. Status colors (danger/success/info/pink/sky) keep their hue across themes; brand tokens (primary, gold, sand, cream, linen, highlight, brown) shift per palette, and dark modes invert the lightness ramp (backgrounds become dark tints of the theme hue, primary text becomes a light tint). `--color-white` and `--color-warm-white` are surface tokens (script paper, panels, toggle knob): they stay white in light themes but become a dark elevated surface in dark themes.

Preview swatches for the theme picker are available as always-light tokens: `--swatch-sable-1..3`, `--swatch-foret-1..3`, `--swatch-ocean-1..3`.

### Where themes live

- **Shared enum**: `packages/utils/src/themes.ts` (`THEME_VALUES`, `parseThemeValue`, etc.) — used by both the API (validation, persistence) and the webapp.
- **Persistence**: per-user, stored in the `users.theme` column (default `sable-light`) through the `userPreferences.getTheme` / `userPreferences.setTheme` tRPC routes; cached in `localStorage` under `marivo-theme` and applied before first paint in `main.tsx` to avoid a flash of the default theme.
- **Switcher**: `apps/webapp/src/features/theme/theme-switcher.component.tsx`, mounted as a custom page (`<UserProfile.Page label="Theme">`) inside Clerk's `<UserProfile>` on the account page. Clerk's own components pick up the active theme through the `var(--color-cream-deep)` background passed in its `appearance` prop.
