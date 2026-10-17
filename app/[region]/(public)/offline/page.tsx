import type { Metadata } from 'next';
import Link from 'next/link';
import { MOCK_MODE } from '@/lib/api/client';
import { getT } from '@/lib/i18n/server';
import { Boom } from './boom';

export const metadata: Metadata = {
  title: 'Offline',
  robots: { index: false, follow: false },
};

/**
 * Offline fallback (T74). The bare `/offline` path would hit the region guard
 * and 404, so it lives under each market like every other page; this build has
 * no service worker to send the visitor here, so nothing links to it yet — the
 * route exists for that hand-off and for the T74 boundary spec.
 *
 * The Retry action is a plain `<a>` on purpose: recovery means re-requesting
 * the document, not a client-side navigation.
 */
export default async function OfflinePage({
  params,
  searchParams,
}: {
  params: Promise<{ region: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ region }, query] = await Promise.all([params, searchParams]);
  const { t } = await getT('common');

  return (
    <div
      data-testid="offline-page"
      className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col justify-center px-4 py-12"
    >
      {/* MOCK-ONLY: `?boom=1` mounts the one-shot thrower so the (public) boundary can be exercised in a real browser; without mock mode the hook is dead. */}
      {MOCK_MODE && query.boom === '1' ? <Boom /> : null}
      <h1 className="text-ink text-3xl font-semibold">{t('state.offline')}</h1>
      <p className="text-muted mt-3 text-sm">{t('state.offlineHint')}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        {/* Recovery is a full document re-request, so this stays a plain anchor. */}
        <a
          href={`/${region}/offline`}
          className="bg-accent hover:bg-accent-bright rounded-[8px] px-4 py-2 text-sm font-semibold text-[#1b1b1b]"
        >
          {t('action.retry')}
        </a>
        <Link
          href={`/${region}`}
          className="border-line text-ink hover:border-accent rounded-[8px] border px-4 py-2 text-sm font-medium"
        >
          {t('state.backHome')}
        </Link>
      </div>
    </div>
  );
}
