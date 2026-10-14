import { cookies } from 'next/headers';
import { createTranslator } from 'next-intl';
import { LANG_COOKIE, SHELL_NAMESPACES, resolveLocale, type Locale, type Namespace } from './config';
import { loadMessages, type Messages } from './messages';

export type ServerTranslate = (key: string, values?: Record<string, string | number>) => string;

/** The visitor's language: the `brand_lang` cookie, defaulting to English. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return resolveLocale(store.get(LANG_COOKIE)?.value);
}

/**
 * Translator for a server component. Only the requested namespace is read from
 * disk — a promotions page never pulls in the game-page strings.
 */
export async function getT(
  namespace: Namespace,
  locale?: Locale,
): Promise<{ locale: Locale; t: ServerTranslate }> {
  const resolved = locale ?? (await getLocale());
  const messages = await loadMessages(resolved, [namespace]);
  // Messages are read at runtime, so keys cannot be typed statically; the cast
  // keeps the call signature (key, values) => string instead of `never` keys.
  const t = createTranslator({ locale: resolved, messages, namespace }) as unknown as ServerTranslate;
  return { locale: resolved, t };
}

/** Locale plus the namespaces the shell renders (header, drawer, footer). */
export async function getShell(): Promise<{ locale: Locale; messages: Record<string, Messages> }> {
  const locale = await getLocale();
  return { locale, messages: await loadMessages(locale, SHELL_NAMESPACES) };
}
