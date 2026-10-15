import type { Metadata } from 'next';
import Link from 'next/link';
import { PROMOTION_CATEGORIES, getPromotions } from '@/lib/api';
import { regionPath } from '@/config/nav';
import { getT } from '@/lib/i18n/server';
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
 * Promotion list, in the reference build's order (`crawl/pages/my_promotion.html`):
 * the `form-title` with its page icon, the `.nav-pill__wrapper` category row and
 * the `.promotion-list__wrapper` card grid. The category lives in `?cat=`, so the
 * page stays server-rendered and a refresh — or a shared link — lands on the same
 * tab. Each card is a single link to its detail page, as `.promotion-card` is.
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

  const listed =
    category === 'all'
      ? promotions
      : promotions.filter((promotion) => promotion.category === category);

  return (
    <div data-page="promotion-list">
      <JsonLd
        data={breadcrumbLd(
          [{ name: brand.name, path: '' }, { name: t('pages.promotion'), path: '/promotion' }],
          region,
        )}
      />

      <h1 className="page-title has-space">
        <span aria-hidden className="page-title__icon game-placeholder" />
        {t('pages.promotion')}
      </h1>

      <div
        className="nav-pill__wrapper promotion-cats has-space"
        role="group"
        aria-label={t('pages.promotion')}
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
              className="nav-pill"
            >
              {t(`promotion.tab.${tab}`)}
            </Link>
          );
        })}
      </div>

      <p className="text-muted mt-4 text-xs" aria-live="polite">
        {t('promotion.count', { count: listed.length })}
      </p>

      {listed.length === 0 ? (
        <div className="no-info-box">{t('promotion.empty')}</div>
      ) : (
        <ul data-promo-grid className="promotion-list__wrapper has-space">
          {listed.map((promotion) => (
            <li key={promotion.id}>
              <article data-promotion={promotion.id} data-category={promotion.category}>
                <Link
                  href={regionPath(region, `/promotion/${promotion.id}`)}
                  className="promotion-card"
                >
                  {/* Artwork placeholder: hue from the record until real art lands. */}
                  <span
                    aria-hidden
                    className="promotion-card__header game-placeholder block"
                    style={{ '--tone': String(promotion.tone) } as React.CSSProperties}
                  />
                  <span className="promotion-card__footer">{promotion.title}</span>
                </Link>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
