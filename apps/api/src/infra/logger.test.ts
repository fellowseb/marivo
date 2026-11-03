import { describe, it, expect } from "vitest";
import { getLogger, getRequestLogger } from "./logger.ts";

describe("logger", () => {
  it("returns a singleton configured from config (logging.level defaults to info)", () => {
    const logger = getLogger();
    expect(getLogger()).toBe(logger);
    expect(logger.level).toBe("info");
    expect(logger.bindings()).toMatchObject({ service: "marivo-api" });
  });

  it("attaches the request id as a binding when provided", () => {
    expect(getRequestLogger("req-123").bindings()).toMatchObject({ requestId: "req-123" });
    expect(getRequestLogger(undefined).bindings()).not.toHaveProperty("requestId");
  });
});
