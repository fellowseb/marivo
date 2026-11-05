import { getThemeName, getThemeMode, makeThemeValue, THEME_MODES, type ThemeValue } from "@marivo/utils";
import { useTheme } from "./theme.context.tsx";
import styles from "./theme-switcher.module.css";

const THEME_SWATCHES: Record<string, string[]> = {
  sable: ["var(--swatch-sable-1)", "var(--swatch-sable-2)", "var(--swatch-sable-3)"],
  foret: ["var(--swatch-foret-1)", "var(--swatch-foret-2)", "var(--swatch-foret-3)"],
  ocean: ["var(--swatch-ocean-1)", "var(--swatch-ocean-2)", "var(--swatch-ocean-3)"],
};

export function ThemeSwitcher() {
  const { theme, setTheme, options } = useTheme();
  const selectedName = getThemeName(theme);
  const selectedMode = getThemeMode(theme);

  return (
    <div className={styles.container}>
      <div className={styles.themes} role="radiogroup" aria-label="Theme">
        {options.map((option) => {
          const isSelected = option.name === selectedName;
          return (
            <button
              key={option.name}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`${styles.themeCard} ${isSelected ? styles.themeCardSelected : ""}`}
              onClick={() => setTheme(makeThemeValue(option.name, selectedMode) as ThemeValue)}
            >
              <span className={styles.themeName}>{option.label}</span>
              <span className={styles.themeDescription}>{option.description}</span>
              <span className={styles.swatches}>
                {(THEME_SWATCHES[option.name] ?? []).map((color) => (
                  <span
                    key={color}
                    className={styles.swatch}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <div className={styles.modeToggle} role="radiogroup" aria-label="Theme mode">
        {THEME_MODES.map((mode) => {
          const isSelected = mode === selectedMode;
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`${styles.modeButton} ${isSelected ? styles.modeButtonSelected : ""}`}
              onClick={() => setTheme(makeThemeValue(selectedName, mode) as ThemeValue)}
            >
              {mode === "light" ? "Light" : "Dark"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ThemeSwitcher;
