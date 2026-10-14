import type { Metadata } from 'next';
import Link from 'next/link';
import { getUpdates } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { regionPath } from '@/config/nav';
import { getT } from '@/lib/i18n/server';

export const metadata: Metadata = {
  title: 'Update',
  description: 'Product news and service notices.',
};

/**
 * Update list, laid out after `banner-section` in docs/CONTENT_REFERENCE.md: a
 * banner band, then the cards. The list is newest-first — `getUpdates()` sorts,
 * so the order holds however the data arrives.
 */
export default async function UpdateListPage({
  params,
}: {
  params: Promise<{ region: string }>;
}) {
  const { region } = await params;
  const [{ t }, updates] = await Promise.all([getT('content'), getUpdates()]);

  return (
    <div data-page="update-list">
      {/* Banner band: the reference build opens this page with one. */}
      <section
        data-part="banner-section"
        className="game-placeholder flex h-32 items-center rounded-[var(--radius-panel)] px-5 desktop:h-40 desktop:px-8"
        style={{ '--tone': '42' } as React.CSSProperties}
      >
        <div>
          <h1 className="text-ink text-xl font-semibold desktop:text-2xl">{t('pages.update')}</h1>
          <p className="text-ink/85 mt-1 text-xs" aria-live="polite">
            {t('update.count', { count: updates.length })}
          </p>
        </div>
      </section>

      {updates.length === 0 ? (
        <p className="text-muted mt-5 text-sm">{t('update.empty')}</p>
      ) : (
        <ul className="mt-5 grid gap-4 desktop:grid-cols-3 desktop:gap-5">
          {updates.map((update) => (
            <li key={update.id}>
              <article
                data-update={update.id}
                className="border-line bg-panel hover:border-accent flex h-full flex-col rounded-[var(--radius-panel)] border transition-colors"
              >
                {/* Cover placeholder until real artwork lands. */}
                <span
                  aria-hidden
                  className="game-placeholder h-24 rounded-t-[var(--radius-panel)]"
                  style={{ '--tone': String(update.tone) } as React.CSSProperties}
                />
                <div className="flex flex-1 flex-col p-4">
                  <p className="text-muted text-[11px]">
                    {t('update.published', { date: formatDate(update.publishedAt) })}
                  </p>
                  <h2 className="text-ink mt-1 text-sm font-semibold">{update.title}</h2>
                  <p className="text-muted mt-1 text-xs">{update.summary}</p>
                  <Link
                    href={regionPath(region, `/update/${update.id}`)}
                    className="border-accent text-accent hover:bg-panel-soft mt-4 inline-block rounded-[8px] border px-3 py-1.5 text-center text-xs font-semibold"
                  >
                    {t('update.read')}
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
