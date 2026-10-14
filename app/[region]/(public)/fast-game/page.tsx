/** Same data and components as /slots, by design (only the heading differs). */
import type { Metadata } from 'next';
import { GameLobby } from '@/components/game/GameLobby';
import { IntlScope } from '@/lib/i18n/scope';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region } = await params;
  return pageMetadata('fastGame', { region, path: '/fast-game' });
}

type SearchParams = Record<string, string | string[] | undefined>;

export default async function FastGamePage({
  params,
  searchParams,
}: {
  params: Promise<{ region: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { region } = await params;

  return (
    <IntlScope namespaces={['games']}>
      <GameLobby
        region={region}
        headingKey="page.fastGame"
        introKey="page.slotsIntro"
        searchParams={await searchParams}
      />
    </IntlScope>
  );
}
