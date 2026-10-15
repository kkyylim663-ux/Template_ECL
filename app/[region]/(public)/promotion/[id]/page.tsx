import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPromotion, getPromotionNeighbours } from '@/lib/api';
import { regionPath } from '@/config/nav';
import { getT } from '@/lib/i18n/server';
import { Markdown } from '@/components/content/Markdown';
import { InfoRule } from '@/components/event/InfoRule';
import { Icon } from '@/components/ui/Icon';
import { pageMetadata } from '@/lib/seo';
import { JsonLd } from '@/components/content/JsonLd';
import { breadcrumbLd } from '@/lib/seo';
import { brand } from '@/config/brand';

/** Detail pages carry their own title and summary (T24). */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string; id: string }>;
}): Promise<Metadata> {
  const { region, id } = await params;
  const promotion = await getPromotion(id);

  return pageMetadata('promotion', {
    region,
    path: `/promotion/${id}`,
    title: promotion?.title,
    description: promotion?.summary,
    type: 'article',
  });
}

/**
 * Offer detail, in the reference build's order (`crawl/pages/my_promotion_1.html`):
 * an "All Promotions" back header, `.promotion-detail__banner` carrying the two
 * paging arrows around the artwork, the 20px/500 title, then the body copy. The
 * terms sit in the shared `.info-rule` panel, open by default because they read
 * as page copy. An id that is not in the data is a 404, not an empty page.
 */
export default async function PromotionDetailPage({
  params,
}: {
  params: Promise<{ region: string; id: string }>;
}) {
  const { region, id } = await params;
  const [{ t }, promotion] = await Promise.all([getT('content'), getPromotion(id)]);

  if (!promotion) notFound();

  const { previous, next } = await getPromotionNeighbours(promotion.id);

  return (
    <div data-page="promotion-detail">
      <JsonLd
        data={breadcrumbLd(
          [
            { name: brand.name, path: '' },
            { name: t('pages.promotion'), path: '/promotion' },
            { name: promotion.title, path: `/promotion/${promotion.id}` },
          ],
          region,
        )}
      />

      <Link
        href={regionPath(region, '/promotion')}
        data-part="promotion-detail__back"
        className="page-title has-space promotion-detail__back"
      >
        <Icon name="chevronLeft" size={20} className="mr-[7px]" />
        <span aria-hidden className="page-title__icon game-placeholder" />
        {t('promotionDetail.all')}
      </Link>

      <div className="promotion-detail__container">
        <div data-part="promotion-detail__banner" className="promotion-detail__banner has-space">
          {previous ? (
            <Link
              href={regionPath(region, `/promotion/${previous.id}`)}
              rel="prev"
              aria-label={t('promotionDetail.previous')}
              className="promotion-detail__arrow"
            >
              <Icon name="chevronLeft" size={22} />
            </Link>
          ) : null}

          {/* Artwork placeholder: hue from the record until real art lands. */}
          <span
            aria-hidden
            className="promotion-detail__banner-img game-placeholder block"
            style={{ '--tone': String(promotion.tone) } as React.CSSProperties}
          />

          {next ? (
            <Link
              href={regionPath(region, `/promotion/${next.id}`)}
              rel="next"
              aria-label={t('promotionDetail.next')}
              className="promotion-detail__arrow"
            >
              <Icon name="chevronRight" size={22} />
            </Link>
          ) : null}
        </div>

        <h1 className="promotion-detail__title has-space">{promotion.title}</h1>

        <div data-part="promotion-detail__body" className="promotion-detail__body has-space">
          <p>{promotion.summary}</p>

          <div data-part="promotion-detail__rules" className="mt-6">
            <InfoRule title={t('promotionDetail.rulesTitle')} defaultOpen>
              <Markdown source={promotion.rules} />
            </InfoRule>
          </div>
        </div>
      </div>
    </div>
  );
}
