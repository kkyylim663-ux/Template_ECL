import Link from 'next/link';
import { getT } from '@/lib/i18n/server';

/**
 * Not-found for everything under a region: a page that calls `notFound()` (a
 * delisted promotion, an unknown FAQ topic) lands here instead of on the bare
 * root 404. It renders within `[region]/layout.tsx` only, so like the root page
 * it brings its own centring, and the market-agnostic copy sends "Back to home"
 * through the root redirect, which middleware answers with the default market.
 */
export default async function RegionNotFound() {
  const { t } = await getT('common');

  return (
    <main
      data-testid="region-not-found"
      className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center px-4 py-16"
    >
      <p className="text-muted text-xs font-medium tracking-[0.2em] uppercase">
        {t('state.errorCode')}
      </p>
      <h1 className="text-ink mt-3 text-3xl font-semibold">{t('state.notFound')}</h1>
      <p className="text-muted mt-3 text-sm">{t('state.notFoundHint')}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/"
          className="bg-accent hover:bg-accent-bright rounded-[8px] px-4 py-2 text-sm font-semibold text-[#1b1b1b]"
        >
          {t('state.backHome')}
        </Link>
      </div>
    </main>
  );
}
