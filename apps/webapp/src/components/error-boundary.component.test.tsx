import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import ErrorBoundary, { ErrorFallback } from "./error-boundary.component";
import { logger } from "../lib/logger";

vi.mock("../lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

function Thrower(): never {
  throw new Error("boom");
}

describe("ErrorBoundary", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <div>all good</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText("all good")).toBeTruthy();
  });

  it("renders the custom fallback and logs when a child throws", () => {
    // React logs caught errors to console.error; silence it for this test
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary fallback={<div>custom fallback</div>}>
        <Thrower />
      </ErrorBoundary>,
    );
    expect(screen.getByText("custom fallback")).toBeTruthy();
    expect(logger.error).toHaveBeenCalledOnce();
    expect(vi.mocked(logger.error).mock.calls[0][0]).toBe("error boundary caught an error");
  });

  it("falls back to ErrorFallback by default", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByRole("button", { name: /reload page/i })).toBeTruthy();
  });
});

describe("ErrorFallback", () => {
  it("offers a reload action", () => {
    render(<ErrorFallback />);
    expect(screen.getByRole("button", { name: /reload page/i })).toBeTruthy();
  });
});
