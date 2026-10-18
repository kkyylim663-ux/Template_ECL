import type { Metadata } from 'next';
import { CategoryLobby } from '@/components/game/CategoryLobby';
import { getCategoryProviderCards, getVpnDemo } from '@/lib/api';
import { IntlScope } from '@/lib/i18n/scope';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region } = await params;
  return pageMetadata('esports', { region, path: '/esports' });
}

/**
 * Esports studios, same block order as live casino; the reference ships the
 * VPN dialog here too, so Play opens it instead of navigating.
 */
export default async function EsportsPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const [providers, vpnDemo] = await Promise.all([
    getCategoryProviderCards('esports'),
    getVpnDemo(),
  ]);

  return (
    <IntlScope namespaces={['games', 'home']}>
      <CategoryLobby
        region={region}
        category="esports"
        headingKey="category.esports"
        heroSlug="esports"
        providers={providers}
        vpnNotice
        vpnDemo={vpnDemo}
      />
    </IntlScope>
  );
}
