export class AppError extends Error {
  public readonly statusCode: number;

  public readonly code: string;

  public readonly details: unknown;

  public constructor(statusCode: number, code: string, message: string, details: unknown = null) {
    super(message);

    this.name = 'AppError';

    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class BadRequestError extends AppError {
  public constructor(message: string, details: unknown = null) {
    super(400, 'BAD_REQUEST', message, details);
  }
}
