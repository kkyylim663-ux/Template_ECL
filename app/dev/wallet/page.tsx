import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DevWalletPanel } from '@/components/dev/DevWalletPanel';
import { MOCK_MODE } from '@/lib/api/client';
import { IntlScope } from '@/lib/i18n/scope';

/**
 * Mock-mode-only wallet simulator (T45 supplement). `robots.ts` disallows `/dev`
 * and it never enters the sitemap; outside mock mode the route does not exist.
 */
export const metadata: Metadata = {
  title: 'Wallet simulator',
  robots: { index: false, follow: false },
};

export default function DevWalletPage() {
  if (!MOCK_MODE) notFound();
  return (
    <IntlScope namespaces={['account']}>
      <DevWalletPanel />
    </IntlScope>
  );
}
