export type ErrorFamily = 'client' | 'server';

export abstract class AppError extends Error {
  constructor(
    message: string,
    code: string,
    family: ErrorFamily,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.code = code;
    this.family = family;
  }

  public code: string;
  public family: ErrorFamily;
}
