import { describe, expect, it } from 'vitest';
import am from '../../messages/am.json';
import en from '../../messages/en.json';
import om from '../../messages/om.json';

/** Every leaf of a message catalog as a dotted path, e.g. `organisation.errors.generic`. */
function keysOf(catalog: object, prefix = ''): string[] {
  return Object.entries(catalog).flatMap(([key, value]) =>
    value && typeof value === 'object' ? keysOf(value, `${prefix}${key}.`) : [`${prefix}${key}`]
  );
}

/**
 * The ICU argument names a message uses: `name` from `{name}`, `count` from `{count, plural, ...}`.
 * The text of a plural branch (`other {s}`) is not an argument.
 */
function argumentsOf(message: string): string[] {
  const names = message.matchAll(/(?<!\b(?:zero|one|two|few|many|other|=\d+)\s*)\{\s*(\w+)\s*[,}]/g);
  return [...new Set([...names].map((match) => match[1]!))].sort();
}

function messageAt(catalog: object, path: string): string {
  return path.split('.').reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], catalog) as string;
}

describe('message catalogs', () => {
  const enKeys = keysOf(en);

  for (const [locale, catalog] of [
    ['am', am],
    ['om', om],
  ] as const) {
    it(`${locale}.json has exactly the keys en.json has`, () => {
      const keys = new Set(keysOf(catalog));
      expect(enKeys.filter((key) => !keys.has(key))).toEqual([]);
      expect([...keys].filter((key) => !enKeys.includes(key))).toEqual([]);
    });

    // A translation may leave an argument out (Amharic and Oromo need no plural on `count`), but a
    // placeholder en.json does not have would render as a raw error at runtime.
    it(`${locale}.json uses no message argument that en.json lacks`, () => {
      const unknown = enKeys.filter((key) => {
        const allowed = argumentsOf(messageAt(en, key));
        return argumentsOf(messageAt(catalog, key)).some((name) => !allowed.includes(name));
      });
      expect(unknown).toEqual([]);
    });
  }
});
