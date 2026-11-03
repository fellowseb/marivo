import { describe, it, expect, vi, afterEach } from "vitest";
import { logger } from "./logger";

describe("logger", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("emits a structured entry with ts, level, message and context", () => {
    vi.stubEnv("VITE_LOG_LEVEL", "debug");
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});

    logger.info("hello", { foo: 1 });

    expect(spy).toHaveBeenCalledOnce();
    const entry = spy.mock.calls[0][0] as Record<string, unknown>;
    expect(entry).toMatchObject({ service: "marivo-webapp", level: "info", message: "hello", foo: 1 });
    expect(typeof entry.ts).toBe("string");
  });

  it("filters out levels below VITE_LOG_LEVEL", () => {
    vi.stubEnv("VITE_LOG_LEVEL", "warn");
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    logger.debug("nope");
    logger.info("nope");
    logger.warn("yes");

    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it("defaults to debug in dev (import.meta.env.DEV is true under vitest)", () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    logger.debug("visible in dev");

    expect(debugSpy).toHaveBeenCalledOnce();
  });
});
