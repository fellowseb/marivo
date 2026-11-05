# Marivo Webapp Design System

This document describes the design token layer for the webapp (`apps/webapp`). All tokens are defined once in the `:root` block of `apps/webapp/src/index.css` and consumed everywhere else through `var(--token)` — component CSS modules and inline styles must not hardcode raw values.

A guard test (`apps/webapp/src/design-tokens.test.ts`) enforces this: it fails when a CSS file outside `index.css` contains a hardcoded hex color or references an undefined token.

## Theming architecture

Color tokens are **derived, not hand-specified**, and **semantic**: a `--color-*` name describes the role of the color (background, surface, text, border, accent…), never its appearance. Each theme defines only a handful of base hues (`--t-brand`, `--t-accent`, `--t-warm`, `--t-cream`, `--t-brown`, `--t-danger`, `--t-success`, `--t-info`, `--t-pink`, `--t-sky`); every `--color-*` token is computed from them with `color-mix(in oklch, …)` (OKLCH is perceptually uniform, unlike HSL lightness). Alpha variants are `color-mix(in oklch, var(--color-accent) N%, transparent)`. The only appearance-named tokens are the literal primitives `--color-white`, `--color-warm-white`, `--color-black`, `--color-transparent`.

- **Light themes** (`:root` = Sable, `[data-theme="foret"]`, `[data-theme="ocean"]`) only override the `--t-*` base hues; all `--color-*` tokens follow automatically.
- **Dark mode** is a single `[data-mode="dark"]` block that remaps the semantic tokens once for every theme: surfaces become a brand-tinted near-black base (`#0c0f12` + brand) with elevation expressed as white overlays; text becomes a white alpha ramp (`0.87` / `0.6` / `0.45`, never pure white); accents are desaturated and lightened; status hues keep their hue but lighten. Never use pure `#000` for surfaces in dark mode.
- To add a theme: add a `ThemePalette` entry in `packages/utils/src/themes.ts` (light + dark base hues), then regenerate the CSS blocks in `index.css` from it. Dark mode comes for free via the shared remap.
- 30 themes ship out of the box (Sable, Forêt, Océan, Nord, Gruvbox, Solarized, Dracula, Catppuccin, Tokyo Night, One Dark, Ayu, Everforest, Rosé Pine, Kanagawa, Palenight, Horizon, Night Owl, Monokai, GitHub, Material, Lavender, Sunset, Forest Mist, Desert, Arctic, Cherry, Mint, Amber, Slate, Berry) — each with a light and a dark variant.
- The token tables below show the **Sable light** render for reference; other themes/mode derive their values as described above.

## Color tokens

Naming rule: `--color-*` names describe **usage**, not appearance. Roles never change per theme — only the `--t-*` hues do.

### Accent (interactive brand color)

| Token | Value | Usage |
| --- | --- | --- |
| `--color-accent` | `#1f313c` | Main brand color: links, buttons, item borders, headings |
| `--color-accent-a07` … `--color-accent-a80` | `#1f313c11` … `#1f313ccc` | Accent with alpha steps (07/10/13/33/47/60/80): overlays, hover states, subtle borders |

### Focus / active indicator

| Token | Value | Usage |
| --- | --- | --- |
| `--color-focus` | `#e8ce7d` | Focus rings, selected items, active toggles |
| `--color-focus-a13`, `--color-focus-a60` | `#e8ce7d22`, `#e8ce7d99` | Focus color with alpha: glows, subtle fills |

### Page background

| Token | Value | Usage |
| --- | --- | --- |
| `--color-bg` | `#e4d6bc` | Page background |
| `--color-bg-a00` / `a20` / `a40` / `a60` | `#e4d6bc00` / `#e4d6bc33` / `#e4d6bc66` / `#e4d6bc99` | Background with alpha: list containers, hover tints |
| `--color-bg-soft` / `--color-bg-dim` / `--color-bg-deep` | `#e9dec9` / `#dccdab` / `#d8c69f` | Background elevation steps |
| `--color-highlight` | `#ebcf96` | Highlighted background |

### Surfaces

| Token | Value | Usage |
| --- | --- | --- |
| `--color-surface` | `#fef8eb` | Main surface (header, dialogs) |
| `--color-surface-alt` / `-dim` / `-dark` / `-deep` | `#f9f1e2` / `#efeadf` / `#f3ead6` / `#ece2cc` | Surface elevation steps |
| `--color-card` | `#e8e4da` | Card / list-item background |
| `--color-panel` | `#ffffff` | Script page and side panels (elevated surface in dark) |
| `--color-surface-sunken` | `#eeeeee` | Sunken / inset background |

### Text

| Token | Value | Usage |
| --- | --- | --- |
| `--color-text` (+ `a07`) | `#333333` | Primary text |
| `--color-text-secondary` (+ `a13` / `a20`) | `#8a6d3b` | Secondary text (metadata; theme brown hue) |
| `--color-text-muted` | `#666666` | Muted text |
| `--color-text-faint` (+ `a08`) | `#999999` | Placeholders, faint labels |
| `--color-text-disabled` | `#bbbbbb` | Disabled text |

### Borders

| Token | Value | Usage |
| --- | --- | --- |
| `--color-border` (+ `a40`) | `#cccccc` | Default borders |
| `--color-border-strong` | `#cebc96` | Strong borders on the page background |

### Status colors

| Token | Value | Usage |
| --- | --- | --- |
| `--color-danger` / `--color-danger-dark` / `--color-danger-bg` | `#f43d3d` / `#c62828` / `#ffebee` | Errors, destructive actions |
| `--color-success` / `--color-success-bg` | `#2e7d32` / `#e8f5e9` | Success states |
| `--color-info` / `--color-info-bg` | `#1976d2` / `#e3f2fd` | Informational states |
| `--color-error` | `#b00020` | Error text (inline alerts) |
| `--color-bookmark` / `--color-bookmark-a27` | `#d63384` / `#ffb6c144` | Bookmarked items |
| `--color-invite` / `--color-invite-a27` | `#60c5ea` / `#60c5ea44` | Play invitations |

### Literal primitives (appearance-named, theme-independent)

| Token | Value | Usage |
| --- | --- | --- |
| `--color-white` (+ `a13`/`a20`/`a33`/`a60` alpha steps) | `#ffffff` | Overlays on imagery, toggle knob |
| `--color-warm-white` (+ `a53`) | `#fefefe` | Warm near-white overlay |
| `--color-black` | `#000000` | Pure black |
| `--color-transparent` | `#0000` | Fully transparent |

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
| `--shadow-sm` | `2px 2px 2px var(--color-bg)` |
| `--shadow-md` | `4px 4px 2px var(--color-text-muted)` |
| `--shadow-lg` | `6px 15px 2px var(--color-bg)` |
| `--shadow-inset-left` | `-4px 0 8px rgba(0, 0, 0, 0.15)` |

## Conventions

- Never hardcode hex colors, font sizes, radii, or shadows in `*.module.css` files or inline styles — use the tokens above.
- Component-local custom properties (e.g. `--button-height`, `--toggle-diameter`) are allowed for component-internal calculations; they must derive their colors from the global tokens.
- New colors should reuse an existing token when possible. If a genuinely new color is needed, add it as a `--t-*` base hue (preferred) or a derived `--color-*` token in the `:root` block of `index.css` (the single source of truth) and document it here.
- New themes only set `--t-*` hues in a `[data-theme="name"]` block — do not re-specify `--color-*` per theme or per mode.

## Theming

Every color goes through a CSS custom property, so themes are declared as token overrides on the document element — no component CSS changes. Two attributes drive theming:

- `data-theme` — the palette: `sable` (default) plus 29 more, see `THEME_PALETTES` in `packages/utils/src/themes.ts`
- `data-mode` — the variant: `light` (default) or `dark`

The `:root` block in `index.css` is the **Sable light** theme (the historical default). Each of the 30 themes then has a `[data-theme="name"]` block (light hues) and a `[data-theme="name"][data-mode="dark"]` block (dark hues incl. `--t-dark-base`); a single shared `[data-mode="dark"]` block remaps all semantic `--color-*` tokens for every theme.

Status colors (danger/success/info/bookmark/invite) keep their hue across themes; brand-derived roles (accent, focus, bg, surface, highlight, text-secondary) shift per palette. Dark modes invert the lightness ramp: backgrounds become dark tints of the theme hue (`--t-dark-base` + accent), text becomes a white alpha ramp, and `--color-panel` becomes an elevated surface instead of white.

Preview swatches for the theme picker are available as always-light tokens: `--swatch-<theme>-1..3` for each of the 30 themes.

### Where themes live

- **Shared enum**: `packages/utils/src/themes.ts` (`THEME_VALUES`, `parseThemeValue`, etc.) — used by both the API (validation, persistence) and the webapp.
- **Persistence**: per-user, stored in the `users.theme` column (default `sable-light`) through the `userPreferences.getTheme` / `userPreferences.setTheme` tRPC routes; cached in `localStorage` under `marivo-theme` and applied before first paint in `main.tsx` to avoid a flash of the default theme.
- **Switcher**: `apps/webapp/src/features/theme/theme-switcher.component.tsx`, mounted as a custom page (`<UserProfile.Page label="Theme">`) inside Clerk's `<UserProfile>` on the account page. Clerk's own components pick up the active theme through the `var(--color-surface-deep)` background passed in its `appearance` prop.
