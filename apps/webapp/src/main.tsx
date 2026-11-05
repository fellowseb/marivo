import { createRoot } from "react-dom/client";
import App from "./app";
import { applyTheme, readStoredTheme } from "./features/theme/theme";

// Apply the stored theme before first paint to avoid a flash of the default theme.
applyTheme(readStoredTheme());

createRoot(document.getElementById("root")!).render(<App />);
