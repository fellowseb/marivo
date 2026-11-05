import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ThemeSwitcher from "./theme-switcher.component";
import type { ThemeValue } from "@marivo/utils";

const setTheme = vi.fn();

function mockUseTheme(theme: ThemeValue) {
  return {
    theme,
    setTheme,
    options: [
      { name: "sable", label: "Sable", description: "Warm parchment tones (default)" },
      { name: "foret", label: "Forêt", description: "Deep woodland greens" },
      { name: "ocean", label: "Océan", description: "Cool seaside blues" },
    ],
  };
}

let currentTheme: ThemeValue = "sable-light";

vi.mock("./theme.context", () => ({
  useTheme: () => mockUseTheme(currentTheme),
}));

describe("ThemeSwitcher", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the three themes and marks the selected one", () => {
    currentTheme = "sable-light";
    render(<ThemeSwitcher />);

    expect(screen.getByText("Sable")).toBeTruthy();
    expect(screen.getByText("Forêt")).toBeTruthy();
    expect(screen.getByText("Océan")).toBeTruthy();

    const sable = screen.getByRole("radio", { name: /Sable/ });
    expect(sable.getAttribute("aria-checked")).toBe("true");
    const foret = screen.getByRole("radio", { name: /Forêt/ });
    expect(foret.getAttribute("aria-checked")).toBe("false");
  });

  it("switches theme while keeping the current mode", () => {
    currentTheme = "sable-dark";
    render(<ThemeSwitcher />);

    fireEvent.click(screen.getByRole("radio", { name: /Océan/ }));

    expect(setTheme).toHaveBeenCalledWith("ocean-dark");
  });

  it("switches mode while keeping the current theme", () => {
    currentTheme = "foret-light";
    render(<ThemeSwitcher />);

    fireEvent.click(screen.getByRole("radio", { name: "Dark" }));

    expect(setTheme).toHaveBeenCalledWith("foret-dark");
  });

  it("marks the current mode as selected", () => {
    currentTheme = "ocean-dark";
    render(<ThemeSwitcher />);

    expect(screen.getByRole("radio", { name: "Dark" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "Light" }).getAttribute("aria-checked")).toBe("false");
  });
});
