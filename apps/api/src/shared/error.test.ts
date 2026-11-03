import { describe, it, expect } from "vitest";
import {
  APP_ERROR_HTTP_STATUS,
  AppError,
  InternalServerError,
  UnauthorizedError,
  appErrorToHttpStatus,
} from "./error.ts";

class BadRequestError extends AppError {
  constructor() {
    super("bad", "BAD_REQUEST");
  }
}
class NotFoundError extends AppError {
  constructor() {
    super("nf", "NOT_FOUND");
  }
}

describe("APP_ERROR_HTTP_STATUS", () => {
  it("maps every AppErrorCode to its HTTP status", () => {
    expect(APP_ERROR_HTTP_STATUS).toEqual({
      BAD_REQUEST: 400,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      INTERNAL_SERVER_ERROR: 500,
    });
  });

  it("appErrorToHttpStatus resolves via the error code", () => {
    expect(appErrorToHttpStatus(new BadRequestError())).toBe(400);
    expect(appErrorToHttpStatus(new NotFoundError())).toBe(404);
    expect(appErrorToHttpStatus(new InternalServerError())).toBe(500);
    expect(appErrorToHttpStatus(new UnauthorizedError())).toBe(401);
  });
});
