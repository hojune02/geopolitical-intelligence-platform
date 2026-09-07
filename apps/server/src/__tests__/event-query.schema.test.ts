import { describe, expect, it } from 'vitest';

import { eventQuerySchema } from '../schemas/event-query.schema.js';

describe('eventQuerySchema', () => {
  it('applies pagination defaults', () => {
    const result = eventQuerySchema.parse({});

    expect(result.page).toBe(1);

    expect(result.limit).toBe(50);
  });

  it('coerces numeric query parameters', () => {
    const result = eventQuerySchema.parse({
      page: '2',
      limit: '25',
      quadClass: '4',
    });

    expect(result.page).toBe(2);

    expect(result.limit).toBe(25);

    expect(result.quadClass).toBe(4);
  });

  it('rejects an invalid Goldstein range', () => {
    const result = eventQuerySchema.safeParse({
      minGoldstein: '5',
      maxGoldstein: '-5',
    });

    expect(result.success).toBe(false);
  });

  it('rejects end date before start date', () => {
    const result = eventQuerySchema.safeParse({
      startDate: '2026-09-01',
      endDate: '2026-08-01',
    });

    expect(result.success).toBe(false);
  });
});
