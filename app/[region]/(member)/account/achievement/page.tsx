import type { Metadata } from 'next';
import { getAchievementsInfo } from '@/lib/api/achievements';
import { getT } from '@/lib/i18n/server';
import { regionConfig, type RegionCode } from '@/config/brand';
import { AchievementPanel } from '@/components/account/AchievementPanel';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT('nav');
  return { title: t('items.achievement'), robots: { index: false, follow: false } };
}

/**
 * Standalone page, like the original: a 1300px banner band above the
 * achievement panel, with no account menu or balance strip. The initial rung
 * state is fetched here so the server-rendered HTML carries it (and the
 * zh-Hans probe can read it); the panel re-reads `/api/achievements` itself
 * after a claim moves a rung.
 */
export default async function AchievementPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const { symbol } = regionConfig(region as RegionCode);
  const initial = await getAchievementsInfo();

  return (
    <>
      <section data-part="banner-section" aria-hidden className="page-hero game-banner">
        <picture>
          <source media="(max-width: 768px)" srcSet="/banners/pages/achievement-mobile.webp" />
          <img
            className="banner-section-img hover-grow"
            src="/banners/pages/achievement-desktop.webp"
            alt=""
            loading="lazy"
            decoding="async"
          />
        </picture>
      </section>
      <AchievementPanel symbol={symbol} initial={initial} />
    </>
  );
}
