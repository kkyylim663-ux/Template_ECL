import type { Metadata } from 'next';
import { CategoryLobby } from '@/components/game/CategoryLobby';
import { getCategoryProviderCards } from '@/lib/api';
import { IntlScope } from '@/lib/i18n/scope';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region } = await params;
  return pageMetadata('sports', { region, path: '/sports' });
}

/**
 * Sportsbook studios, same block order as live casino. The reference build has
 * no VPN dialog here, so Play stays a plain inert `#`.
 */
export default async function SportsPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const providers = await getCategoryProviderCards('sports');

  return (
    <IntlScope namespaces={['games', 'home']}>
      <CategoryLobby
        region={region}
        category="sports"
        headingKey="category.sports"
        tone={205}
        heroSlug="sports"
        providers={providers}
      />
    </IntlScope>
  );
}
