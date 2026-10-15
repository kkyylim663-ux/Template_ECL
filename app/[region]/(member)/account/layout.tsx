import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isRegionCode } from '@/config/brand';
import { IntlScope } from '@/lib/i18n/scope';

/**
 * The member area sits behind the sign-in guard and stays out of the index. No
 * `title` here on purpose: a title on this segment would stop the root layout's
 * `%s · BRAND` template from applying to the pages below it.
 *
 * Only the guard and the `account` namespace live at this level. The account
 * shell (menu + balance strip) belongs to the `(family)` group, because the
 * original renders achievements and the ticket centre as standalone pages
 * without it.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ region: string }>;
}) {
  const { region } = await params;

  if (!isRegionCode(region)) notFound();

  return <IntlScope namespaces={['account']}>{children}</IntlScope>;
}
