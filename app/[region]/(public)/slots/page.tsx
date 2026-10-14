import type { Metadata } from 'next';
import { GameLobby } from '@/components/game/GameLobby';
import { IntlScope } from '@/lib/i18n/scope';

export const metadata: Metadata = {
  title: 'Slots',
  description: 'Browse every slot title by studio and category.',
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function SlotsPage({
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
        headingKey="page.slots"
        introKey="page.slotsIntro"
        searchParams={await searchParams}
      />
    </IntlScope>
  );
}
