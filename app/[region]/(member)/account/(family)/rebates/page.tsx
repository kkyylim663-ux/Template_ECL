import { getT } from '@/lib/i18n/server';
import { regionConfig, type RegionCode } from '@/config/brand';
import { Icon } from '@/components/ui/Icon';
import { RebatesPanel } from '@/components/account/RebatesPanel';

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT('nav');
  return { title: t('items.rebates'), robots: { index: false, follow: false } };
}

/**
 * The reference's rebates page is `/my/mypromotion` (the header menu's own
 * "Rebates" entry, `icon-rebates.svg` with the page icon `rebates.png`), an
 * accordion list of claimable blocks; its payout rules come from the Daily Cash
 * Rebate copy on `my_promotions.html`. The panel owns that list plus this
 * build's period selector and records table.
 */
export default async function RebatesPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const { t } = await getT('account');
  const { symbol } = regionConfig(region as RegionCode);

  return (
    <div className="account-content__container">
      <h1 className="form-title mt-5 mb-5">
        <Icon name="rebate" size={28} className="page-icon" />
        {t('rebates.title')}
      </h1>
      <RebatesPanel symbol={symbol} />
    </div>
  );
}
