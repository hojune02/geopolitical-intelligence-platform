import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../errors/app-error.js';

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  next: NextFunction,
): void {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error instanceof AppError) {
    const payload =
      error.details === null
        ? {
            error: {
              code: error.code,

              message: error.message,
            },
          }
        : {
            error: {
              code: error.code,

              message: error.message,

              details: error.details,
            },
          };

    response.status(error.statusCode).json(payload);

    return;
  }

  console.error('Unhandled request error:', error);

  response.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',

      message: 'An unexpected server error occurred',
    },
  });
}
