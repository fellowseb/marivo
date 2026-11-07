import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import i18n from "../../i18n/i18n.ts";
import { LanguageProvider } from "./language.context.tsx";
import LanguageSwitcher from "./language-switcher.component.tsx";
import { LANGUAGE_STORAGE_KEY } from "./language.ts";

vi.mock("../../trpc", () => ({
  useTRPC: () => ({
    userPreferences: {
      getLanguage: {
        queryOptions: () => ({
          queryKey: ["userPreferences.getLanguage"],
          queryFn: async () => ({ language: "auto" }),
        }),
        queryKey: () => ["userPreferences.getLanguage"],
      },
      setLanguage: { mutationOptions: () => ({ mutationKey: ["setLanguage"] }) },
    },
  }),
}));

vi.mock("@clerk/react", () => ({
  useAuth: () => ({ isSignedIn: false }),
}));

function renderSwitcher() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LanguageProvider>
          <LanguageSwitcher />
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("LanguageSwitcher", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    void i18n.changeLanguage("en");
  });

  it("renders the three options with Auto selected by default", async () => {
    renderSwitcher();
    expect(await screen.findByRole("radio", { name: "Auto (browser)" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "English" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Français" })).toBeTruthy();
    expect(
      (screen.getByRole("radio", { name: "Auto (browser)" }) as HTMLButtonElement).getAttribute(
        "aria-checked",
      ),
    ).toBe("true");
  });

  it("switching to French changes the i18n language, <html lang> and localStorage", async () => {
    renderSwitcher();
    fireEvent.click(await screen.findByRole("radio", { name: "Français" }));
    expect(i18n.language).toBe("fr");
    expect(document.documentElement.lang).toBe("fr");
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("fr");
    // the switcher itself re-renders in French
    expect(await screen.findByRole("radio", { name: "Auto (navigateur)" })).toBeTruthy();
  });

  it("switching to English applies en", async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "fr");
    renderSwitcher();
    fireEvent.click(await screen.findByRole("radio", { name: "English" }));
    expect(i18n.language).toBe("en");
    expect(document.documentElement.lang).toBe("en");
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("en");
  });
});
