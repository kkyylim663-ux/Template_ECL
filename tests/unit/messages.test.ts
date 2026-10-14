import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LOCALES, NAMESPACES } from '@/lib/i18n/config';
import { loadMessages } from '@/lib/i18n/messages';

/**
 * The message files guard the four languages against drift: same file set, same
 * keys, same interpolation placeholders. `_scratch/gen-messages.mjs` writes them
 * from one table, and this test proves the table actually made it to every locale.
 */
const MESSAGES_DIR = join(process.cwd(), 'messages');

function flatten(value: Record<string, unknown>, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof child === 'string') out.set(path, child);
    else if (child && typeof child === 'object' && !Array.isArray(child)) {
      for (const [nested, text] of flatten(child as Record<string, unknown>, path)) {
        out.set(nested, text);
      }
    }
  }
  return out;
}

/**
 * Placeholder names, plain `{name}` and ICU `{name, plural, …}` alike. Languages
 * differ in whether they need plurals, so only the names are compared.
 */
function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\s*[,}]/g)].map((match) => match[1]).sort();
}

describe('messages/', () => {
  it('holds one file per locale per namespace', () => {
    expect(readdirSync(MESSAGES_DIR).sort()).toEqual([...LOCALES].sort());
    for (const locale of LOCALES) {
      const files = readdirSync(join(MESSAGES_DIR, locale)).map((file) =>
        file.replace(/\.json$/, ''),
      );
      expect(files.sort()).toEqual([...NAMESPACES].sort());
    }
  });

  for (const namespace of NAMESPACES) {
    it(`${namespace}: keys and placeholders match English in every locale`, async () => {
      const english = await loadMessages('en', [namespace]);
      const baseline = flatten(english[namespace]);
      expect(baseline.size).toBeGreaterThan(0);

      for (const [key, text] of baseline) {
        expect(text, `en/${namespace}.${key} is empty`).not.toBe('');
      }

      for (const locale of LOCALES.filter((code) => code !== 'en')) {
        const messages = await loadMessages(locale, [namespace]);
        const translated = flatten(messages[namespace]);

        expect([...translated.keys()].sort(), `${locale}/${namespace} keys`).toEqual(
          [...baseline.keys()].sort(),
        );

        for (const [key, text] of translated) {
          expect(text, `${locale}/${namespace}.${key} is empty`).not.toBe('');
          expect(placeholders(text), `${locale}/${namespace}.${key} placeholders`).toEqual(
            placeholders(baseline.get(key) as string),
          );
        }
      }
    });
  }
});
