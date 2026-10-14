/**
 * Language configuration. The URL carries the market (`/my`, `/sg`); the cookie
 * carries the language — the same split the reference site uses, so a shared
 * link keeps working whichever language the visitor picked.
 */
export const LOCALES = ['en', 'zh-Hans', 'zh-Hant', 'vi'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

/** Readable by the client: the switcher writes it, the server reads it. */
export const LANG_COOKIE = 'brand_lang';
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** One file per locale per namespace under `messages/`. */
export const NAMESPACES = ['common', 'nav', 'games', 'home', 'auth', 'account', 'content'] as const;
export type Namespace = (typeof NAMESPACES)[number];

/** Namespaces the shell always needs (header, drawer, footer, switcher). */
export const SHELL_NAMESPACES = ['common', 'nav'] as const satisfies readonly Namespace[];

/**
 * `nav.lang.*` key per locale. Note the spelling: a message key segment cannot
 * contain a dot, so `zh-Hans` becomes `zhHans`.
 */
export const LOCALE_KEYS: Record<Locale, string> = {
  en: 'lang.en',
  'zh-Hans': 'lang.zhHans',
  'zh-Hant': 'lang.zhHant',
  vi: 'lang.vi',
};

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (LOCALES as readonly string[]).includes(value);
}

/** Cookie value → a locale the app can render; anything else falls back to `en`. */
export function resolveLocale(value: string | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
