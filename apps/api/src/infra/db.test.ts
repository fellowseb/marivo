import { describe, it, expect, vi } from "vitest";
import { AppError } from "../shared/error.ts";
import { poolOptionsFromEnv } from "./db.ts";

describe("poolOptionsFromEnv", () => {
  it("returns explicit defaults when no env is set", () => {
    expect(poolOptionsFromEnv({})).toEqual({
      max: 10,
      connect_timeout: 10,
      idle_timeout: 20,
      max_lifetime: 30 * 60,
    });
  });

  it("parses overrides from env", () => {
    expect(
      poolOptionsFromEnv({
        POSTGRES_POOL_MAX: "25",
        POSTGRES_CONNECT_TIMEOUT: "5",
        POSTGRES_IDLE_TIMEOUT: "60",
        POSTGRES_MAX_LIFETIME: "3600",
      }),
    ).toEqual({
      max: 25,
      connect_timeout: 5,
      idle_timeout: 60,
      max_lifetime: 3600,
    });
  });

  it("falls back to defaults on invalid values", () => {
    expect(
      poolOptionsFromEnv({
        POSTGRES_POOL_MAX: "abc",
        POSTGRES_CONNECT_TIMEOUT: "-5",
        POSTGRES_IDLE_TIMEOUT: "0",
      }),
    ).toEqual({
      max: 10,
      connect_timeout: 10,
      idle_timeout: 20,
      max_lifetime: 30 * 60,
    });
  });
});

describe("getDatabase", () => {
  it("throws a typed InternalServerError before initDatabase", async () => {
    vi.resetModules();
    const mod = await import("./db.ts");
    try {
      mod.getDatabase();
      expect.unreachable("should have thrown");
    } catch (error) {
      // Note: no instanceof here — resetModules gives a fresh module graph,
      // so assert the typed error shape instead
      const appError = error as AppError;
      expect(appError.message).toBe("Database not initialized");
      expect(appError.code).toBe("INTERNAL_SERVER_ERROR");
      expect(appError.httpStatus()).toBe(500);
    }
  });
});
