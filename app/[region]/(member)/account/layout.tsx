import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAccountPayload } from '@/lib/api';
import { isRegionCode } from '@/config/brand';
import { AccountNav } from '@/components/account/AccountNav';
import { BalanceBar } from '@/components/account/BalanceBar';

export const metadata: Metadata = {
  title: 'My account',
  robots: { index: false, follow: false },
};

/**
 * Member shell: balance strip + sub-navigation above the ten pages. Middleware
 * already blocks unauthenticated hits; the demo session cookie is what lets a
 * reviewer in.
 */
export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ region: string }>;
}) {
  const { region } = await params;

  if (!isRegionCode(region)) notFound();

  const payload = await getAccountPayload();

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-ink text-xl font-semibold">My account</h1>
          <p className="text-muted mt-1 text-xs">
            {payload.profile.nickname} · VIP {payload.profile.vipTier} ·{' '}
            {payload.profile.kycStatus === 'verified' ? 'verified' : 'verification pending'}
          </p>
        </div>
        <p className="text-muted text-xs">
          Placeholder pages: forms validate locally and submit nothing.
        </p>
      </header>

      <BalanceBar payload={payload} />

      <AccountNav region={region} />

      {children}
    </div>
  );
}
