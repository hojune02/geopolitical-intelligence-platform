import { describe, expect, it } from 'vitest';

import { mapEventQuerySchema } from '../schemas/map-event.schema.js';

describe('mapEventQuerySchema', () => {
  it('accepts normal viewport bounds', () => {
    const result = mapEventQuerySchema.parse({
      north: '60',
      south: '30',
      west: '-20',
      east: '40',
    });

    expect(result.north).toBe(60);

    expect(result.south).toBe(30);

    expect(result.west).toBe(-20);

    expect(result.east).toBe(40);
  });

  it(
  'rejects non-canonical longitudes',
  () => {
    const result =
      mapEventQuerySchema.safeParse({
        north: '60',
        south: '-60',
        west: '-261',
        east: '190',
      });

    expect(
      result.success,
    ).toBe(false);
  },
    );

  it('rejects latitude above 90', () => {
    const result = mapEventQuerySchema.safeParse({
      north: '100',
      south: '30',
      west: '-20',
      east: '40',
    });

    expect(result.success).toBe(false);
  });

  it('rejects south above north', () => {
    const result = mapEventQuerySchema.safeParse({
      north: '20',
      south: '50',
      west: '-20',
      east: '40',
    });

    expect(result.success).toBe(false);
  });
  
});
