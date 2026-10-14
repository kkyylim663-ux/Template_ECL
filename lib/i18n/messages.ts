import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Locale, Namespace } from './config';

/**
 * Server-only message loader. Messages are read from `messages/<locale>/<ns>.json`
 * at request time, one file per namespace, and only the namespaces a page asks
 * for. Nothing is bundled into client code, so no build artifact ever holds more
 * than the locales that end up in an RSC payload response.
 *
 * `process.cwd()` is the app root under `next dev` and `next start` alike.
 */
/** Shape of a message file: nested objects whose leaves are strings. */
export type Messages = { [key: string]: Messages | string };

const cache = new Map<string, Messages>();

export async function loadMessages(
  locale: Locale,
  namespaces: readonly Namespace[],
): Promise<Record<string, Messages>> {
  const entries = await Promise.all(
    namespaces.map(async (namespace) => [namespace, await loadNamespace(locale, namespace)] as const),
  );
  return Object.fromEntries(entries);
}

async function loadNamespace(locale: Locale, namespace: Namespace): Promise<Messages> {
  const key = `${locale}/${namespace}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const file = join(process.cwd(), 'messages', locale, `${namespace}.json`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(file, 'utf8'));
  } catch (cause) {
    throw new Error(`Cannot read message file messages/${locale}/${namespace}.json`, { cause });
  }
  if (!isPlainObject(parsed)) {
    throw new Error(`messages/${locale}/${namespace}.json must hold an object`);
  }

  cache.set(key, parsed);
  return parsed;
}

function isPlainObject(value: unknown): value is Messages {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
