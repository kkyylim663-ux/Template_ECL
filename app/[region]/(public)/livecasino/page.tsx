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
  return pageMetadata('livecasino', { region, path: '/livecasino' });
}

/**
 * Live casino, in the reference build's order: banner, `form-title`, the Game
 * Providers grid and the Betting Transaction block. Play warns about a VPN —
 * the same dead end the reference has.
 */
export default async function LiveCasinoPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const [providers, vpnDemo] = await Promise.all([
    getCategoryProviderCards('livecasino'),
    getVpnDemo(),
  ]);

  return (
    <IntlScope namespaces={['games', 'home']}>
      <CategoryLobby
        region={region}
        category="livecasino"
        headingKey="category.livecasino"
        tone={8}
        heroSlug="livecasino"
        providers={providers}
        vpnNotice
        vpnDemo={vpnDemo}
      />
    </IntlScope>
  );
}
