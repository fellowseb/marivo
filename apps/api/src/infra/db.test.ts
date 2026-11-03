import { describe, it, expect, vi } from "vitest";
import { AppError } from "../shared/error.ts";

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
