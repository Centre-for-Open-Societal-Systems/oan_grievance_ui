import { describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import am from '../../../messages/am.json';
import om from '../../../messages/om.json';

/** Every dotted leaf path under an object. */
function keysOf(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') return [prefix];
  return Object.entries(value).flatMap(([key, child]) => keysOf(child, prefix ? `${prefix}.${key}` : key));
}

describe('analytics messages', () => {
  const english = keysOf(en.analytics).sort();

  it.each([
    ['am', am],
    ['om', om],
  ])('has every analytics key of en.json in %s.json, and nothing extra', (_locale, catalog) => {
    expect(keysOf(catalog.analytics).sort()).toEqual(english);
  });
});
