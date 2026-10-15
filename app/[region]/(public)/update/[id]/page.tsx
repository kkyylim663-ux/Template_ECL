import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getUpdate, getUpdates } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import { Markdown } from '@/components/content/Markdown';
import { regionPath } from '@/config/nav';
import { getT } from '@/lib/i18n/server';
import { JsonLd } from '@/components/content/JsonLd';
import { breadcrumbLd } from '@/lib/seo';
import { brand } from '@/config/brand';
import { pageMetadata } from '@/lib/seo';

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
 * Update detail, in the reference build's order (`crawl/pages/my_update_52.html`):
 * an "Update" back header, the date, the 20px title and the body copy. Paging
 * walks the newest-first order — the arrows in the back header are prev/next.
 * An id that is not in the data is a 404.
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
    <div data-page="update-detail">
      <JsonLd
        data={breadcrumbLd(
          [
            { name: brand.name, path: '' },
            { name: t('pages.update'), path: '/update' },
            { name: update.title, path: `/update/${update.id}` },
          ],
          region,
        )}
      />

      <div className="update-detail__back">
        {newer ? (
          <Link
            href={regionPath(region, `/update/${newer.id}`)}
            rel="prev"
            aria-label={t('update.previous')}
            className="text-ink flex items-center"
          >
            <Icon name="chevronLeft" size={20} className="mr-[7px]" />
          </Link>
        ) : null}

        <Link
          href={regionPath(region, '/update')}
          data-part="update-detail__back"
          className="page-title"
        >
          <span aria-hidden className="page-title__icon game-placeholder" />
          {t('pages.update')}
        </Link>
      </div>

      <div className="update-detail__date">{formatDate(update.publishedAt)}</div>
      <h1 className="update-detail__title">{update.title}</h1>

      <div data-part="update-detail__body" className="update-detail__desc">
        <Markdown source={update.body} />
      </div>

      {older ? (
        <p className="mt-6">
          <Link
            href={regionPath(region, `/update/${older.id}`)}
            rel="next"
            aria-label={t('update.next')}
            className="update-detail__back page-title"
          >
            {older.title}
            <Icon name="chevronRight" size={20} className="ml-[7px]" />
          </Link>
        </p>
      ) : null}
    </div>
  );
}
