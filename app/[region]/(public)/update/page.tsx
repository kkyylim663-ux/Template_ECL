import type { Metadata } from 'next';
import Link from 'next/link';
import { getUpdates } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { regionPath } from '@/config/nav';
import { JsonLd } from '@/components/content/JsonLd';
import { breadcrumbLd } from '@/lib/seo';
import { brand } from '@/config/brand';
import { getT } from '@/lib/i18n/server';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region } = await params;
  return pageMetadata('update', { region, path: '/update' });
}

/**
 * Update list, in the reference build's order (`crawl/pages/my_update.html`):
 * the `form-title` with its page icon, then one `.update-card` per notice — cover
 * on the left, the date / status strip and the clamped summary on the right. The
 * list is newest-first: `getUpdates()` sorts, so the order holds however the data
 * arrives. The reference's own list is empty and shows `.no-info-box`.
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
      <JsonLd
        data={breadcrumbLd(
          [{ name: brand.name, path: '' }, { name: t('pages.update'), path: '/update' }],
          region,
        )}
      />

      <section data-part="banner-section" aria-hidden className="page-hero game-banner">
        <picture>
          <source media="(max-width: 768px)" srcSet="/banners/pages/update-mobile.webp" />
          <img
            className="banner-section-img hover-grow"
            src="/banners/pages/update-desktop.webp"
            alt=""
            loading="lazy"
            decoding="async"
          />
        </picture>
      </section>

      <h1 className="page-title has-space">
        <span aria-hidden className="page-title__icon game-placeholder" />
        {t('pages.update')}
      </h1>

      <p className="text-muted mt-4 text-xs" aria-live="polite">
        {t('update.count', { count: updates.length })}
      </p>

      {updates.length === 0 ? (
        <div className="no-info-box">{t('update.empty')}</div>
      ) : (
        <div className="mt-2">
          {updates.map((update) => (
            <article key={update.id} data-update={update.id} className="update-card">
              {/* Cover placeholder until real artwork lands. */}
              <span
                aria-hidden
                className="update-cover__img game-placeholder block"
                style={{ '--tone': String(update.tone) } as React.CSSProperties}
              />

              <div className="update-right">
                <div className="update-header">
                  <span className="update-date">{formatDate(update.publishedAt)}</span>
                  <span aria-hidden className="update-divider" />
                  <span className="update-status">{t('update.status')}</span>
                </div>
                <h2 className="update-title">
                  <Link href={regionPath(region, `/update/${update.id}`)}>{update.title}</Link>
                </h2>
                <p className="update-desc">{update.summary}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
