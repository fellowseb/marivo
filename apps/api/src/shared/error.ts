export type AppErrorCode =
  | 'BAD_REQUEST' // 400
  | 'UNAUTHORIZED' // 401
  | 'FORBIDDEN' // 403
  | 'NOT_FOUND' // 404
  | 'INTERNAL_SERVER_ERROR'; // 500

export abstract class AppError extends Error {
  constructor(message: string, code: AppErrorCode, options?: ErrorOptions) {
    super(message, options);
    this.code = code;
  }

  public code: AppErrorCode;
}
