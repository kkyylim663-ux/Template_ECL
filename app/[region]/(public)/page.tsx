import type { Metadata } from 'next';
import { getBanners, getPromotions, getSlotGameList, listProviders } from '@/lib/api';
import { BannerCarousel } from '@/components/home/BannerCarousel';
import { EntryCards } from '@/components/home/EntryCards';
import { ProviderWall } from '@/components/home/ProviderWall';
import { brand } from '@/config/brand';
import { formatMinor } from '@/lib/format';
import Link from 'next/link';
import { regionPath } from '@/config/nav';
import Image from 'next/image';
import { IntlScope } from '@/lib/i18n/scope';
import { getT } from '@/lib/i18n/server';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region } = await params;
  return pageMetadata('home', { region, path: '' });
}

/**
 * Home page. Server-rendered from the mock layer: carousel, quick-entry cards,
 * studio wall and a promotions strip. The announcement marquee comes from the
 * shell, so it is on every page and costs this page nothing.
 */
export default async function HomePage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const [{ t }, { t: tc }, banners, providers, promotions] = await Promise.all([
    getT('home'),
    getT('common'),
    getBanners(),
    getSlotGameList().then((list) => listProviders(list)),
    getPromotions(),
  ]);

  const totalTitles = providers.reduce((sum, provider) => sum + provider.totalGames, 0);

  return (
    <IntlScope namespaces={['home', 'games']}>
      <div className="space-y-8 desktop:space-y-10">
        <BannerCarousel banners={banners} region={region} />

        <section>
          <h2 className="text-ink text-sm font-semibold">{t('section.entryCards')}</h2>
          <div className="mt-3">
            <EntryCards region={region} />
          </div>
        </section>

        <section>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-ink text-sm font-semibold">{t('section.providers')}</h2>
            <p className="text-muted text-xs">
              {t('studios.summary', { studios: providers.length, titles: totalTitles })}
            </p>
          </div>
          <div className="mt-3">
            <ProviderWall providers={providers} region={region} limit={14} />
          </div>
          <p className="text-muted mt-3 text-xs">
            {t('studios.allBefore', { count: providers.length })}{' '}
            <Link href={regionPath(region, '/slots')} className="text-accent hover:underline">
              {t('studios.allLink')}
            </Link>
            {t('studios.allAfter')}
          </p>
        </section>

        <section>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-ink text-sm font-semibold">{t('section.promotions')}</h2>
            <Link
              href={regionPath(region, '/promotion')}
              className="text-accent text-xs hover:underline"
            >
              {tc('action.viewAll')}
            </Link>
          </div>

          <ul className="mt-3 grid gap-3 desktop:grid-cols-2 desktop:gap-5">
            {promotions.slice(0, 3).map((promotion) => (
              <li
                key={promotion.id}
                className="border-line bg-panel hover:border-accent rounded-[var(--radius-panel)] border p-4 transition-colors"
              >
                <Link href={regionPath(region, `/promotion/${promotion.slug}`)}>
                  <div className="flex items-start gap-3">
                    <span className="bg-accent grid size-11 shrink-0 place-items-center rounded-[10px] text-xs font-bold text-[#1b1b1b]">
                      {promotion.bonusPct % 1 === 0 ? `${promotion.bonusPct}%` : '0.8%'}
                    </span>
                    <span className="min-w-0">
                      <span className="text-ink block text-sm font-semibold">{promotion.title}</span>
                      <span className="text-muted mt-0.5 block text-xs">{promotion.summary}</span>
                      <span className="text-accent mt-1.5 block text-[11px]">
                        {promotion.rolloverMultiplier > 0
                          ? t('promotions.rollover', { value: promotion.rolloverMultiplier })
                          : t('promotions.noRollover')}
                        {promotion.maxBonusMinor > 0
                          ? ` · ${t('promotions.maxBonus', {
                              amount: formatMinor(promotion.maxBonusMinor, 'MYR', 'en-MY', {
                                compact: true,
                              }),
                            })}`
                          : ''}
                      </span>
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-line bg-panel flex flex-col items-center gap-3 rounded-[var(--radius-panel)] border p-6 text-center desktop:flex-row desktop:justify-between desktop:text-left">
          <div className="flex items-center gap-3">
            <Image
              src={brand.logo.src}
              alt={brand.logo.alt}
              width={32}
              height={32}
              unoptimized
              loading="lazy"
            />
            <div>
              <p className="text-ink text-sm font-semibold">{brand.name}</p>
              <p className="text-muted text-xs">{brand.legal.demoNotice}</p>
            </div>
          </div>
          <Link
            href={regionPath(region, '/faq/downloadapp')}
            className="border-accent text-accent rounded-[8px] border px-4 py-2 text-xs font-semibold"
          >
            {t('app.get')}
          </Link>
        </section>
      </div>
    </IntlScope>
  );
}
