import type { Metadata } from 'next';
import { GameLobby } from '@/components/game/GameLobby';

export const metadata: Metadata = {
  title: 'Fast games',
  description: 'Crash, keno and instant rounds — browse by studio and category.',
};

type SearchParams = Record<string, string | string[] | undefined>;

/** Same data and components as /slots, by design (only the heading differs). */
export default async function FastGamePage({
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
      heading="Fast games"
      intro="Browse only — launching a game is disabled in this build."
      searchParams={await searchParams}
    />
  );
}
