import { getT } from '@/lib/i18n/server';
import { BankingDetailsPanel } from '@/components/account/BankingDetailsPanel';

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT('nav');
  return { title: t('items.bankingDetails'), robots: { index: false, follow: false } };
}

/**
 * Banking Details — the reference's `/my/mybanks`, the page its member menu
 * lists between Profile and Rebates ("Banking Details", icon
 * `icon-banking-details.svg`). That page's own chunk was never captured, so the
 * body is reconstructed from the captured stylesheet's banking classes and the
 * resource keys the shared bundle carries (`/banking/banking-detail/{lang}`:
 * `bank` / `account-number` / `status` / `action` / `new-bank` / `account-name` /
 * `add-bank-account`) — evidence in `site/_scratch/t56-research.md` §3.2.
 */
export default function BankingDetailsPage() {
  return (
    <div className="account-content__container">
      <BankingDetailsPanel />
    </div>
  );
}
