import { z } from 'zod';

import { BadRequestError } from '../errors/app-error.js';

export function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);

  if (result.success) {
    return result.data;
  }

  const details = result.error.issues.map((issue) => ({
    path: issue.path.join('.'),

    message: issue.message,
  }));

  throw new BadRequestError('Invalid request parameters', details);
}
