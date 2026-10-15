import type { Metadata } from 'next';
import { getAccountPayload } from '@/lib/api';
import { getT } from '@/lib/i18n/server';
import { regionConfig, type RegionCode } from '@/config/brand';
import { AchievementPanel } from '@/components/account/AchievementPanel';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT('nav');
  return { title: t('items.achievement'), robots: { index: false, follow: false } };
}

/**
 * Standalone page, like the original: a 1300px banner band above the
 * achievement panel, with no account menu or balance strip.
 */
export default async function AchievementPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const payload = await getAccountPayload();
  const currency = regionConfig(region as RegionCode).currency;

  const milestones = payload.achievements.map((achievement) => ({
    id: achievement.id,
    category: achievement.gameType,
    title: achievement.title,
    requirement: (achievement.requirementMinor / 100).toLocaleString('en-MY', { maximumFractionDigits: 0 }),
    progress: (achievement.progressMinor / 100).toLocaleString('en-MY', { maximumFractionDigits: 0 }),
    progressMinor: achievement.progressMinor,
    requirementMinor: achievement.requirementMinor,
    reward: `${currency} ${(achievement.rewardMinor / 100).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`,
    status: achievement.status,
  }));

  return (
    <>
      <section
        data-part="banner-section"
        aria-hidden
        className="page-hero game-placeholder h-40 max-desktop:h-28"
      />
      <AchievementPanel milestones={milestones} currency={currency} />
    </>
  );
}
