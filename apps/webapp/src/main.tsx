import { createRoot } from "react-dom/client";
import App from "./app";
import { applyTheme, readStoredTheme } from "./features/theme/theme";
// Initializes i18next (and <html lang>) with the stored language preference
// before first render, so the first paint is already localized.
import "./i18n/i18n.ts";

// Apply the stored theme before first paint to avoid a flash of the default theme.
applyTheme(readStoredTheme());

createRoot(document.getElementById("root")!).render(<App />);
