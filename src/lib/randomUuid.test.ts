import { describe, expect, it } from 'vitest';
import { randomUuid } from './randomUuid';

describe('randomUuid', () => {
  it('generates a valid UUID v4 format string', () => {
    const uuid = randomUuid();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('generates unique UUIDs on subsequent calls', () => {
    const uuid1 = randomUuid();
    const uuid2 = randomUuid();
    expect(uuid1).not.toBe(uuid2);
  });
});
