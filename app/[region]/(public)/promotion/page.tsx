import type { Metadata } from 'next';
import Link from 'next/link';
import { PROMOTION_CATEGORIES, getPromotions } from '@/lib/api';
import type { Promotion } from '@/lib/api';
import { formatDate, formatMinor } from '@/lib/format';
import { regionPath } from '@/config/nav';
import { regionConfig, type RegionCode } from '@/config/brand';
import { getT, type ServerTranslate } from '@/lib/i18n/server';
import { JsonLd } from '@/components/content/JsonLd';
import { breadcrumbLd } from '@/lib/seo';
import { brand } from '@/config/brand';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region } = await params;
  return pageMetadata('promotion', { region, path: '/promotion' });
}

type Category = (typeof PROMOTION_CATEGORIES)[number] | 'all';

const CATEGORY_TABS: Category[] = ['all', ...PROMOTION_CATEGORIES];

function isCategory(value: string): value is Category {
  return (CATEGORY_TABS as readonly string[]).includes(value);
}

/**
 * Promotion list, laid out after `promotion-list__wrapper` in
 * docs/CONTENT_REFERENCE.md: a category row above a card grid. The category lives
 * in `?cat=`, so the page stays server-rendered and a refresh — or a shared link
 * — lands on the same tab.
 */
export default async function PromotionPage({
  params,
  searchParams,
}: {
  params: Promise<{ region: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { region } = await params;
  const query = await searchParams;
  const [{ t }, promotions] = await Promise.all([getT('content'), getPromotions()]);

  const requested = typeof query.cat === 'string' ? query.cat : '';
  const category: Category = isCategory(requested) ? requested : 'all';
  const currency = regionConfig(region as RegionCode).currency;

  const listed =
    category === 'all'
      ? promotions
      : promotions.filter((promotion) => promotion.category === category);

  return (
    <div data-page="promotion-list">
      <JsonLd data={breadcrumbLd([{ name: brand.name, path: '' }, { name: t('pages.promotion'), path: '/promotion' }], region)} />
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-ink text-xl font-semibold">{t('pages.promotion')}</h1>
          <p className="text-muted mt-1 text-xs" aria-live="polite">
            {t('promotion.count', { count: listed.length })}
          </p>
        </div>
      </header>

      <nav
        aria-label={t('pages.promotion')}
        className="border-line mt-5 flex flex-wrap gap-1 border-b"
      >
        {CATEGORY_TABS.map((tab) => {
          const active = tab === category;
          const href =
            tab === 'all'
              ? regionPath(region, '/promotion')
              : `${regionPath(region, '/promotion')}?cat=${tab}`;
          return (
            <Link
              key={tab}
              href={href}
              data-cat={tab}
              aria-current={active ? 'true' : undefined}
              className={`-mb-px inline-flex min-h-11 items-center border-b-2 px-4 py-3 text-xs font-semibold tracking-wide uppercase ${
                active ? 'border-accent text-accent' : 'text-muted hover:text-ink border-transparent'
              }`}
            >
              {t(`promotion.tab.${tab}`)}
            </Link>
          );
        })}
      </nav>

      {listed.length === 0 ? (
        <div className="border-line bg-panel mt-5 rounded-[var(--radius-panel)] border p-8 text-center">
          <p className="text-ink text-sm font-medium">{t('promotion.empty')}</p>
          <p className="text-muted mt-1 text-xs">{t('promotion.emptyHint')}</p>
        </div>
      ) : (
        // One column at 375px; three on the desktop grid.
        <ul data-promo-grid className="mt-5 grid gap-4 desktop:grid-cols-3 desktop:gap-5">
          {listed.map((promotion) => (
            <li key={promotion.id}>
              <PromotionCard promotion={promotion} region={region} currency={currency} t={t} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PromotionCard({
  promotion,
  region,
  currency,
  t,
}: {
  promotion: Promotion;
  region: string;
  currency: string;
  t: ServerTranslate;
}) {
  return (
    <article
      data-promotion={promotion.id}
      data-category={promotion.category}
      className="border-line bg-panel hover:border-accent flex h-full flex-col rounded-[var(--radius-panel)] border transition-colors"
    >
      {/* Banner placeholder: the hue comes from the record until real art lands. */}
      <span
        aria-hidden
        className="game-placeholder flex h-28 items-end rounded-t-[var(--radius-panel)] p-3"
        style={{ '--tone': String(promotion.tone) } as React.CSSProperties}
      >
        <span className="bg-accent rounded-[8px] px-2 py-1 text-xs font-bold text-[#1b1b1b]">
          {promotion.bonusPct > 0 ? `${promotion.bonusPct}%` : t('promotion.tab.vip')}
        </span>
      </span>

      <div className="flex flex-1 flex-col p-4">
        <h2 className="text-ink text-sm font-semibold">{promotion.title}</h2>
        <p className="text-muted mt-1 text-xs">{promotion.summary}</p>

        <p className="text-muted mt-2 text-11">
          {t('promotion.validFrom', { date: formatDate(promotion.startsAt) })}
          <br />
          {t('promotion.validUntil', { date: formatDate(promotion.endsAt) })}
        </p>

        <p className="text-accent mt-2 text-11">
          {promotion.rolloverMultiplier > 0
            ? t('promotion.rollover', { value: promotion.rolloverMultiplier })
            : t('promotion.noRollover')}
          {promotion.maxBonusMinor > 0
            ? ` · ${t('promotion.maxBonus', {
                amount: formatMinor(promotion.maxBonusMinor, currency, 'en-MY', { compact: true }),
              })}`
            : ''}
        </p>

        <Link
          href={regionPath(region, `/promotion/${promotion.id}`)}
          className="border-accent text-accent hover:bg-panel-soft mt-4 inline-flex min-h-11 items-center justify-center rounded-[8px] border px-4 py-2.5 text-center text-xs font-semibold"
        >
          {t('promotion.viewDetails')}
        </Link>
      </div>
    </article>
  );
}
