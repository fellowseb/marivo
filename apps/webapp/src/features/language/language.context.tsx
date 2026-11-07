import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@clerk/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "../../trpc.ts";
import { isLanguageValue, type LanguageValue, type SupportedLanguage } from "@marivo/utils";
import {
  applyLanguage,
  readStoredLanguage,
  resolveStoredLanguage,
  storeLanguage,
} from "./language.ts";

interface LanguageContextValue {
  /** stored preference: "auto" | "en" | "fr" */
  preference: LanguageValue;
  /** resolved concrete language currently applied */
  language: SupportedLanguage;
  setPreference: (preference: LanguageValue) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<LanguageValue>(() => readStoredLanguage());
  const { isSignedIn } = useAuth();
  const trpc = useTRPC();

  // Apply the stored preference on mount (i18n was already initialized with it)
  useEffect(() => {
    applyLanguage(preference);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: storedPreference } = useQuery({
    ...trpc.userPreferences.getLanguage.queryOptions(),
    enabled: isSignedIn === true,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (storedPreference?.language && isLanguageValue(storedPreference.language)) {
      setPreferenceState(storedPreference.language);
      storeLanguage(storedPreference.language);
      applyLanguage(storedPreference.language);
    }
  }, [storedPreference]);

  const { mutateAsync: saveLanguage } = useMutation(
    trpc.userPreferences.setLanguage.mutationOptions(),
  );

  const setPreference = useCallback(
    (next: LanguageValue) => {
      setPreferenceState(next);
      storeLanguage(next);
      applyLanguage(next);
      if (isSignedIn) {
        saveLanguage({ language: next }).catch(() => {
          // the preference stays applied locally even if persisting fails
        });
      }
    },
    [isSignedIn, saveLanguage],
  );

  const language = resolveStoredLanguage(preference);

  return (
    <LanguageContext.Provider value={{ preference, language, setPreference }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
