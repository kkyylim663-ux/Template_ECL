import type { Metadata } from 'next';
import { getVipLevels, getVipPrivileges, getVipRules } from '@/lib/api';
import { getT } from '@/lib/i18n/server';
import { IntlScope } from '@/lib/i18n/scope';
import { regionConfig, type RegionCode } from '@/config/brand';
import { VipTierTrack } from '@/components/content/VipTierTrack';
import { InfoRuleToggle } from '@/components/content/InfoRuleToggle';
import { Markdown } from '@/components/content/Markdown';

export const metadata: Metadata = {
  title: 'VIP',
  description: 'Tiers, thresholds and benefits.',
};

/**
 * VIP page, laid out after `vip-tier-track` in docs/CONTENT_REFERENCE.md: the
 * level track, the privilege matrix across tiers, the benefits of the selected
 * tier, and the rules behind an `info-rule__btn-toggle`.
 */
export default async function VipPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const [{ t }, levels, privileges, rules] = await Promise.all([
    getT('content'),
    getVipLevels(),
    getVipPrivileges(),
    getVipRules(),
  ]);

  const currency = regionConfig(region as RegionCode).currency;

  // Benefits are rendered here, per tier, so the client track only has to pick
  // which pre-rendered panel to show.
  const benefits = Object.fromEntries(
    levels.map((level) => [
      level.id,
      <ul key={level.id} className="mt-3 space-y-2">
        {level.benefits.map((benefit) => (
          <li key={benefit} className="text-muted flex items-start gap-2 text-xs">
            <span aria-hidden className="text-accent mt-0.5">
              ✓
            </span>
            {benefit}
          </li>
        ))}
      </ul>,
    ]),
  );

  return (
    <IntlScope namespaces={['content']}>
      <div data-page="vip">
        <header>
          <h1 className="text-ink text-xl font-semibold desktop:text-2xl">{t('pages.vip')}</h1>
          <p className="text-muted mt-1 text-xs">{t('vip.intro')}</p>
        </header>

        <h2 className="text-ink mt-6 text-sm font-semibold">{t('vip.privilegesTitle')}</h2>
        <VipTierTrack
          levels={levels}
          currency={currency}
          privileges={privileges}
          benefits={benefits}
        />

        <InfoRuleToggle label={t('vip.rulesLabel')} className="mt-5">
          <Markdown source={rules} />
        </InfoRuleToggle>
      </div>
    </IntlScope>
  );
}
