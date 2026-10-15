import { getT } from '@/lib/i18n/server';
import { regionConfig, type RegionCode } from '@/config/brand';
import { TransferPanel } from '@/components/account/TransferPanel';

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT('nav');
  return { title: t('items.transfer'), robots: { index: false, follow: false } };
}

export default async function TransferPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const currency = regionConfig(region as RegionCode).currency;

  return <TransferPanel currency={currency} />;
}
