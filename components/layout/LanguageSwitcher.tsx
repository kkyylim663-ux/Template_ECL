'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Icon } from '@/components/ui/Icon';
import {
  LANG_COOKIE,
  LANG_COOKIE_MAX_AGE,
  LOCALES,
  LOCALE_KEYS,
  resolveLocale,
  type Locale,
} from '@/lib/i18n/config';

/**
 * Language switcher. The choice is written to the cookie the server reads, then
 * the current route is re-fetched, so the header and menus swap language without
 * a page reload. Two presentations: a dropdown for the desktop header and a chip
 * row for the mobile drawer.
 */
export function LanguageSwitcher({ variant = 'dropdown' }: { variant?: 'dropdown' | 'inline' }) {
  const locale = resolveLocale(useLocale());
  const t = useTranslations('nav');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    function onPointerDown(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open]);

  function choose(next: Locale) {
    setOpen(false);
    if (next === locale) return;
    // Not httpOnly by design: the switcher runs in the browser. The server only
    // reads it for copy selection, so there is no session value at stake.
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=${LANG_COOKIE_MAX_AGE}; samesite=lax`;
    startTransition(() => router.refresh());
  }

  if (variant === 'inline') {
    return (
      <ul className="mt-2 flex flex-wrap gap-2">
        {LOCALES.map((code) => {
          const active = code === locale;
          return (
            <li key={code}>
              <button
                type="button"
                onClick={() => choose(code)}
                aria-pressed={active}
                className={`rounded-[var(--radius-tag)] border px-3 py-1.5 text-xs ${
                  active ? 'border-accent text-accent' : 'border-line text-muted'
                }`}
              >
                {t(LOCALE_KEYS[code])}
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t('ui.language')}
        className="text-ink hover:text-accent flex items-center gap-1.5 text-sm font-medium"
      >
        <Icon name="globe" size={18} />
        <span>{t(LOCALE_KEYS[locale])}</span>
        <Icon name="chevronDown" size={14} className="text-muted" />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label={t('ui.language')}
          className="border-line bg-panel-alt absolute top-full right-0 z-40 mt-2 w-40 rounded-[var(--radius-panel)] border p-1 shadow-2xl shadow-black/50"
        >
          {LOCALES.map((code) => {
            const active = code === locale;
            return (
              <li key={code} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => choose(code)}
                  className={`hover:bg-panel-soft flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-left text-sm ${
                    active ? 'text-accent' : 'text-ink'
                  }`}
                >
                  {t(LOCALE_KEYS[code])}
                  {active ? <Icon name="check" size={14} /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
