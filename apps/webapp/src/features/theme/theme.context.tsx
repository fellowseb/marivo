import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@clerk/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "../../trpc.ts";
import { isThemeValue, type ThemeValue } from "@marivo/utils";
import {
  applyTheme,
  readStoredTheme,
  storeTheme,
  type ThemeMode,
  type ThemeName,
  type ThemeOption,
  THEME_OPTIONS,
} from "./theme.ts";

interface ThemeContextValue {
  theme: ThemeValue;
  setTheme: (theme: ThemeValue) => void;
  options: ThemeOption[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeValue>(() => readStoredTheme());
  const { isSignedIn } = useAuth();
  const trpc = useTRPC();

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const { data: storedTheme } = useQuery({
    ...trpc.userPreferences.getTheme.queryOptions(),
    enabled: isSignedIn === true,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (storedTheme?.theme && isThemeValue(storedTheme.theme)) {
      setThemeState(storedTheme.theme);
      storeTheme(storedTheme.theme);
    }
  }, [storedTheme]);

  const { mutateAsync: saveTheme } = useMutation(
    trpc.userPreferences.setTheme.mutationOptions(),
  );

  const setTheme = useCallback(
    (next: ThemeValue) => {
      setThemeState(next);
      storeTheme(next);
      if (isSignedIn) {
        saveTheme({ theme: next }).catch(() => {
          // the preference stays applied locally even if persisting fails
        });
      }
    },
    [isSignedIn, saveTheme],
  );

  return (
    <ThemeContext.Provider value={{ theme, setTheme, options: THEME_OPTIONS }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export type { ThemeMode, ThemeName, ThemeValue };
