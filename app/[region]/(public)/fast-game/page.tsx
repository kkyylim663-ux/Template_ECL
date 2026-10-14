/** Same data and components as /slots, by design (only the heading differs). */
import type { Metadata } from 'next';
import { GameLobby } from '@/components/game/GameLobby';
import { IntlScope } from '@/lib/i18n/scope';

export const metadata: Metadata = {
  title: 'Fast games',
  description: 'Crash, keno and instant rounds — browse by studio and category.',
};

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
