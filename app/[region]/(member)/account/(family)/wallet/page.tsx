import { getT } from '@/lib/i18n/server';
import { regionConfig, type RegionCode } from '@/config/brand';
import { getTicketsInfo } from '@/lib/api/tickets';
import { WalletPanel } from '@/components/account/WalletPanel';

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT('nav');
  return { title: t('bottom.wallet'), robots: { index: false, follow: false } };
}

/**
 * The wallet page the mobile dock opens — the reference's own `/my/mywallet`.
 */
export default async function WalletPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const currency = regionConfig(region as RegionCode).currency;
  const tickets = await getTicketsInfo();
  const ticketCount = tickets.tickets.filter((ticket) => ticket.status === 'available').length;

  return <WalletPanel region={region} currency={currency} ticketCount={ticketCount} />;
}
