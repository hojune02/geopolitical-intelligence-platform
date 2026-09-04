import { z } from 'zod';

export class ApiError extends Error {
  public readonly status: number;

  public constructor(status: number, message: string) {
    super(message);

    this.name = 'ApiError';

    this.status = status;
  }
}

export function appendQuery(
  searchParams: URLSearchParams,

  key: string,

  value: string | number | boolean | undefined,
): void {
  if (value === undefined) {
    return;
  }

  searchParams.set(key, String(value));
}

export async function fetchAndParse<T>(
  url: URL,
  schema: z.ZodType<T>,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(url, {
    signal,
  });

  if (!response.ok) {
    throw new ApiError(
      response.status,

      `API request failed with status ${String(response.status)}`,
    );
  }

  const body: unknown = await response.json();

  return schema.parse(body);
}
