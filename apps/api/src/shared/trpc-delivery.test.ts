import { describe, it, expect } from "vitest";
import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import { APP_ERROR_HTTP_STATUS, AppError, InternalServerError } from "./error.ts";
import { appErrorToTrpcError } from "./trpc-delivery.ts";

class NotFoundError extends AppError {
  constructor() {
    super("not found", "NOT_FOUND");
  }
}
class ForbiddenError extends AppError {
  constructor() {
    super("forbidden", "FORBIDDEN");
  }
}

describe("appErrorToTrpcError", () => {
  it("converts AppError to TRPCError preserving the code", () => {
    const err = appErrorToTrpcError(new NotFoundError());
    expect(err).toBeInstanceOf(TRPCError);
    expect(err.code).toBe("NOT_FOUND");
  });

  it("maps every AppError code to the HTTP status from APP_ERROR_HTTP_STATUS", () => {
    const cases: [AppError, keyof typeof APP_ERROR_HTTP_STATUS][] = [
      [
        new (class extends AppError {
          constructor() {
            super("m", "BAD_REQUEST");
          }
        })(),
        "BAD_REQUEST",
      ],
      [
        new (class extends AppError {
          constructor() {
            super("m", "UNAUTHORIZED");
          }
        })(),
        "UNAUTHORIZED",
      ],
      [new ForbiddenError(), "FORBIDDEN"],
      [new NotFoundError(), "NOT_FOUND"],
      [new InternalServerError(), "INTERNAL_SERVER_ERROR"],
    ];
    for (const [appError, code] of cases) {
      const trpcError = appErrorToTrpcError(appError);
      expect(getHTTPStatusCodeFromError(trpcError)).toBe(APP_ERROR_HTTP_STATUS[code]);
    }
  });

  it("maps unknown errors to 500 INTERNAL_SERVER_ERROR", () => {
    const err = appErrorToTrpcError(new Error("boom"));
    expect(err).toBeInstanceOf(TRPCError);
    expect(err.code).toBe("INTERNAL_SERVER_ERROR");
    expect(getHTTPStatusCodeFromError(err)).toBe(500);
  });
});
