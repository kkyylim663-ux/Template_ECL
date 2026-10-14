import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAccountPayload } from '@/lib/api';
import { isRegionCode } from '@/config/brand';
import { AccountNav } from '@/components/account/AccountNav';
import { BalanceBar } from '@/components/account/BalanceBar';
import { IntlScope } from '@/lib/i18n/scope';
import { getT } from '@/lib/i18n/server';

/**
 * The member area sits behind the sign-in guard and stays out of the index. No
 * `title` here on purpose: a title on this segment would stop the root layout's
 * `%s · BRAND` template from applying to the ten pages below it.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Member shell: balance strip + sub-navigation above the ten pages. Middleware
 * already blocks unauthenticated hits; the demo session cookie is what lets a
 * reviewer in. The `account` namespace is provided once, here, for every page.
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

  const [{ t }, payload] = await Promise.all([getT('account'), getAccountPayload()]);

  return (
    <IntlScope namespaces={['account']}>
      <div className="space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-ink text-xl font-semibold">{t('subnav.title')}</h1>
            <p className="text-muted mt-1 text-xs">
              {t('headerSummary', {
                nickname: payload.profile.nickname,
                tier: payload.profile.vipTier,
                kyc: t(`profile.kyc.${payload.profile.kycStatus}`),
              })}
            </p>
          </div>
          <p className="text-muted text-xs">{t('layoutNote')}</p>
        </header>

        <BalanceBar payload={payload} region={region} />

        <AccountNav region={region} />

        {children}
      </div>
    </IntlScope>
  );
}
