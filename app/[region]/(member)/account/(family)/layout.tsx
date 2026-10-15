import { notFound } from 'next/navigation';
import { isRegionCode } from '@/config/brand';
import { AccountShell } from '@/components/account/AccountShell';

/**
 * The account family: every page that the original renders inside
 * `.account-wrapper` (deposit, withdrawal, transfer, history, pending, inbox,
 * rebates, profile). Achievements and the ticket centre deliberately sit
 * outside this group — the original renders those two as standalone pages.
 */
export default async function AccountFamilyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ region: string }>;
}) {
  const { region } = await params;

  if (!isRegionCode(region)) notFound();

  return <AccountShell region={region}>{children}</AccountShell>;
}
