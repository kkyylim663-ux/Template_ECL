import { getAccountPayload } from '@/lib/api';
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
  const payload = await getAccountPayload();
  const currency = regionConfig(region as RegionCode).currency;

  const wallets = payload.wallets.map((wallet) => ({
    code: wallet.code,
    name: wallet.name,
    balance: (wallet.amountMinor / 100).toLocaleString('en-MY', { minimumFractionDigits: 2 }),
    available: wallet.available,
  }));
  const main = payload.wallets.find((wallet) => wallet.kind === 'main') ?? payload.wallets[0];
  const game = payload.wallets.find((wallet) => wallet.kind === 'game');

  return (
    <TransferPanel
      wallets={wallets}
      initialFrom={main?.code ?? ''}
      initialTo={game?.code ?? main?.code ?? ''}
      currency={currency}
    />
  );
}
