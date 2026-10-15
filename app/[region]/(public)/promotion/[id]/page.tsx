import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPromotion, getPromotionNeighbours } from '@/lib/api';
import { formatDate, formatMinor } from '@/lib/format';
import { regionPath } from '@/config/nav';
import { regionConfig, type RegionCode } from '@/config/brand';
import { getT } from '@/lib/i18n/server';
import { Markdown } from '@/components/content/Markdown';
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
 * Offer detail, laid out after `promotion-detail__banner` in
 * docs/CONTENT_REFERENCE.md: a banner block, the terms, and paging between
 * offers. An id that is not in the data is a 404, not an empty page.
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
  const currency = regionConfig(region as RegionCode).currency;

  return (
    <div className="mx-auto w-full max-w-3xl">
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
      {/* Banner placeholder: hue from the record until real artwork lands. */}
      <div
        data-part="promotion-detail__banner"
        className="game-placeholder relative flex h-44 items-end rounded-[var(--radius-panel)] p-5 desktop:h-56 desktop:p-8"
        style={{ '--tone': String(promotion.tone) } as React.CSSProperties}
      >
        <div>
          <span className="bg-accent rounded-[8px] px-2 py-1 text-xs font-bold text-[#1b1b1b]">
            {promotion.bonusPct > 0 ? `${promotion.bonusPct}%` : t(`promotion.tab.${promotion.category}`)}
          </span>
          <p className="text-ink mt-2 max-w-xl text-sm desktop:text-base">{promotion.summary}</p>
        </div>
      </div>

      <h1 className="text-ink mt-5 text-xl font-semibold desktop:text-2xl">{promotion.title}</h1>

      <p className="text-muted mt-1.5 text-xs">
        {t('promotion.validFrom', { date: formatDate(promotion.startsAt) })} ·{' '}
        {t('promotion.validUntil', { date: formatDate(promotion.endsAt) })} ·{' '}
        {t(`promotion.tab.${promotion.category}`)}
        {promotion.maxBonusMinor > 0
          ? ` · ${t('promotion.maxBonus', {
              amount: formatMinor(promotion.maxBonusMinor, currency, 'en-MY', { compact: true }),
            })}`
          : ''}
      </p>

      <section data-part="promotion-detail__rules" className="border-line bg-panel mt-5 rounded-[var(--radius-panel)] border p-5">
        <h2 className="text-muted text-11 tracking-widest uppercase">
          {t('promotionDetail.rulesTitle')}
        </h2>
        <div className="mt-2">
          <Markdown source={promotion.rules} />
        </div>
      </section>

      <nav className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs">
        <Link
          href={regionPath(region, '/promotion')}
          className="text-accent hover:underline inline-flex min-h-11 items-center"
          data-part="promotion-detail__back"
        >
          ← {t('promotionDetail.back')}
        </Link>

        <span className="flex flex-wrap items-center gap-3">
          {previous ? (
            <Link
              href={regionPath(region, `/promotion/${previous.id}`)}
              rel="prev"
              className="border-line text-muted hover:border-accent hover:text-ink inline-flex min-h-11 items-center rounded-[8px] border px-3 py-2.5"
            >
              {t('promotionDetail.previous')}: {previous.title}
            </Link>
          ) : null}
          {next ? (
            <Link
              href={regionPath(region, `/promotion/${next.id}`)}
              rel="next"
              className="border-line text-muted hover:border-accent hover:text-ink inline-flex min-h-11 items-center rounded-[8px] border px-3 py-2.5"
            >
              {t('promotionDetail.next')}: {next.title}
            </Link>
          ) : null}
        </span>
      </nav>
    </div>
  );
}
