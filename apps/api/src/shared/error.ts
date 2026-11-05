export type AppErrorCode =
  | "BAD_REQUEST" // 400
  | "UNAUTHORIZED" // 401
  | "FORBIDDEN" // 403
  | "NOT_FOUND" // 404
  | "INTERNAL_SERVER_ERROR"; // 500

/**
 * Single source of truth for AppError code -> HTTP status mapping.
 */
export const APP_ERROR_HTTP_STATUS: Record<AppErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};

export abstract class AppError extends Error {
  constructor(message: string, code: AppErrorCode, options?: ErrorOptions) {
    super(message, options);
    this.code = code;
  }

  public code: AppErrorCode;

  public httpStatus(): number {
    return APP_ERROR_HTTP_STATUS[this.code];
  }
}

export function appErrorToHttpStatus(error: AppError): number {
  return error.httpStatus();
}

export class InternalServerError extends AppError {
  constructor(message = "Internal server error", options?: ErrorOptions) {
    super(message, "INTERNAL_SERVER_ERROR", options);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", options?: ErrorOptions) {
    super(message, "UNAUTHORIZED", options);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", options?: ErrorOptions) {
    super(message, "FORBIDDEN", options);
  }
}
