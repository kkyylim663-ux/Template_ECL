import type { Metadata } from 'next';
import { GameLobby } from '@/components/game/GameLobby';

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
    <GameLobby
      region={region}
      heading="Slots"
      intro="Browse only — launching a game is disabled in this build."
      searchParams={await searchParams}
    />
  );
}
