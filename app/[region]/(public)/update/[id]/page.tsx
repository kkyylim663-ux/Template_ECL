import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getUpdate, getUpdates } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { regionPath } from '@/config/nav';
import { getT } from '@/lib/i18n/server';
import { Markdown } from '@/components/content/Markdown';
import { pageMetadata } from '@/lib/seo';

/** Detail pages carry their own title and summary (T24). */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string; id: string }>;
}): Promise<Metadata> {
  const { region, id } = await params;
  const update = await getUpdate(id);

  return pageMetadata('update', {
    region,
    path: `/update/${id}`,
    title: update?.title,
    description: update?.summary,
    type: 'article',
  });
}

/**
 * Update detail: the same `banner-section` band as the list, the body through the
 * shared markdown renderer, and paging along the newest-first order. An id that is
 * not in the data is a 404.
 */
export default async function UpdateDetailPage({
  params,
}: {
  params: Promise<{ region: string; id: string }>;
}) {
  const { region, id } = await params;
  const [{ t }, update] = await Promise.all([getT('content'), getUpdate(id)]);

  if (!update) notFound();

  // Paging follows the published order, so "previous" is the newer item.
  const updates = await getUpdates();
  const index = updates.findIndex((entry) => entry.id === update.id);
  const newer = index > 0 ? updates[index - 1] : null;
  const older = index >= 0 && index < updates.length - 1 ? updates[index + 1] : null;

  return (
    <div className="mx-auto w-full max-w-3xl" data-page="update-detail">
      <section
        data-part="banner-section"
        className="game-placeholder flex h-32 items-end rounded-[var(--radius-panel)] p-5 desktop:h-40 desktop:p-8"
        style={{ '--tone': String(update.tone) } as React.CSSProperties}
      >
        <p className="text-ink/85 text-xs">
          {t('update.published', { date: formatDate(update.publishedAt) })}
        </p>
      </section>

      <h1 className="text-ink mt-5 text-xl font-semibold desktop:text-2xl">{update.title}</h1>
      <p className="text-muted mt-1.5 text-sm">{update.summary}</p>

      <section
        data-part="update-detail__body"
        className="border-line bg-panel mt-5 rounded-[var(--radius-panel)] border p-5"
      >
        <Markdown source={update.body} />
      </section>

      <nav className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs">
        <Link
          href={regionPath(region, '/update')}
          className="text-accent hover:underline"
          data-part="update-detail__back"
        >
          ← {t('update.back')}
        </Link>

        <span className="flex flex-wrap items-center gap-3">
          {newer ? (
            <Link
              href={regionPath(region, `/update/${newer.id}`)}
              rel="prev"
              className="border-line text-muted hover:border-accent hover:text-ink rounded-[8px] border px-3 py-1.5"
            >
              {t('update.previous')}: {newer.title}
            </Link>
          ) : null}
          {older ? (
            <Link
              href={regionPath(region, `/update/${older.id}`)}
              rel="next"
              className="border-line text-muted hover:border-accent hover:text-ink rounded-[8px] border px-3 py-1.5"
            >
              {t('update.next')}: {older.title}
            </Link>
          ) : null}
        </span>
      </nav>
    </div>
  );
}
