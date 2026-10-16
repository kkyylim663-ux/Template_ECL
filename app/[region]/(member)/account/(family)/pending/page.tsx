import { getAccountPayload } from '@/lib/api';
import { regionConfig, type RegionCode } from '@/config/brand';
import { brand } from '@/config/brand';
import { SOCIAL_LINKS, regionPath } from '@/config/nav';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PendingPanel } from '@/components/account/PendingPanel';
import { getT } from '@/lib/i18n/server';
import { withdrawalRequestStore } from '@/lib/mock-withdrawal/requests';

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT('nav');
  return { title: t('items.pending'), robots: { index: false, follow: false } };
}

/**
 * The original's social strip on this page — five icons, in its own order. The
 * labels come from the shell's own channel data rather than a second copy.
 */
const SOCIALS = [
  { id: 'livechat', labelKey: 'support.liveChat', icon: 'chat' as IconName },
  ...SOCIAL_LINKS.filter((link) => ['facebook', 'telegram', 'instagram', 'x'].includes(link.id)).map(
    (link) => ({ id: link.id, label: link.label, icon: link.id as IconName }),
  ),
];

export default async function PendingPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const [{ t }, payload, requests] = await Promise.all([
    getT('account'),
    getAccountPayload(),
    withdrawalRequestStore.list(),
  ]);
  const currency = regionConfig(region as RegionCode).currency;

  const pending = payload.transactions.filter((transaction) =>
    ['pending', 'processing'].includes(transaction.status),
  );

  return (
    <div className="account-content__container">
      <h1 className="form-title mb-20 has-space">
        <Icon name="pending" size={28} className="page-icon" />
        {t('pending.title')}
      </h1>

      <PendingPanel
        rows={[
          ...requests.map((request) => ({
            id: request.id,
            reference: request.reference,
            kind: 'withdrawal' as const,
            status: 'pending' as const,
            amountMinor: request.amountMinor,
            method: request.methodLabel,
            createdAt: request.createdAt,
          })),
          ...pending.map((transaction) => ({
            id: transaction.id,
            reference: transaction.reference,
            kind: transaction.kind as 'deposit' | 'withdrawal' | 'transfer',
            status: transaction.status as 'pending' | 'processing',
            amountMinor: transaction.amountMinor,
            method: transaction.methodLabel,
            createdAt: transaction.createdAt,
          })),
        ]}
        currency={currency}
      />

      <div className="pending-footer">
        <div className="pending-footer__follow-us box-1 pending-footer__box">
          <h1 className="pending-footer__title">{t('pending.followUs')}</h1>
          <div className="pending-footer__social-wrapper">
            {SOCIALS.map((social) => (
              <a
                key={social.id}
                className="pending-footer__social-icon"
                href={regionPath(region, '/contact')}
                title={'labelKey' in social ? t(social.labelKey) : social.label}
              >
                <Icon name={social.icon} size={20} />
              </a>
            ))}
          </div>
        </div>
        <div className="box-1 pending-footer__box">
          <h1 className="pending-footer__title">{t('pending.officialWebsites')}</h1>
          <div className="pending-footer__website-wrapper">
            {brand.websites.map((site) => (
              <span key={site.href} className="pending-footer__website">
                <Icon name="check" size={16} className="pending-footer__tick" />
                <span>{site.label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
