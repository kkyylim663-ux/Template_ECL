import type { Metadata } from 'next';
import { getDisplayPayload } from '@/lib/api';
import { LaunchButton } from '@/components/game/LaunchButton';
import { InertLink } from '@/components/ui/InertLink';
import { RulesButton } from '@/components/ui/RulesButton';

export const metadata: Metadata = {
  title: 'Number game',
  description: 'A draw every five minutes, with verifiable results.',
};

const NUMBER_GAME_RULES =
  'Six numbers are drawn from 1 to 49 every five minutes. Match three or more to win a tier. Each round is committed before the draw and can be checked against the public chain afterwards — the check links are inert in this build.';

export default async function NumberGamePage() {
  const { numberGame } = await getDisplayPayload();
  const rounds = [
    { round: numberGame.round, numbers: numberGame.numbers, drawnAt: numberGame.drawnAt },
    ...numberGame.history,
  ];

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-ink text-xl font-semibold">Number game</h1>
          <p className="text-muted mt-1 text-xs">
            Round {numberGame.round} · drawn {numberGame.drawnAt.slice(11, 16)} (+08:00)
          </p>
        </div>
        <RulesButton title="Number game rules" body={NUMBER_GAME_RULES} />
      </header>

      <div className="border-line bg-panel mt-5 rounded-[var(--radius-panel)] border p-5">
        <p className="text-muted text-[11px] tracking-widest uppercase">Latest draw</p>
        <ul className="mt-3 flex flex-wrap gap-2.5">
          {numberGame.numbers.map((number) => (
            <li
              key={number}
              className="bg-panel-soft border-accent text-ink grid size-11 place-items-center rounded-full border font-mono text-sm font-semibold"
            >
              {number}
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <LaunchButton provider="numbergame" label="Play next round" />
          <InertLink className="text-accent text-xs hover:underline">
            Verify this round on the explorer
          </InertLink>
        </div>
      </div>

      <h2 className="text-ink mt-8 text-sm font-semibold">Recent rounds</h2>
      <div className="border-line bg-panel mt-3 overflow-hidden rounded-[var(--radius-panel)] border">
        <table className="w-full text-left text-sm">
          <thead className="bg-panel-alt text-muted text-[11px] tracking-wide uppercase">
            <tr>
              <th className="px-4 py-3">Round</th>
              <th className="px-4 py-3">Numbers</th>
              <th className="px-4 py-3">Drawn at</th>
            </tr>
          </thead>
          <tbody>
            {rounds.map((round) => (
              <tr key={round.round} className="border-line border-t">
                <td className="text-ink px-4 py-3 font-mono text-xs">{round.round}</td>
                <td className="text-muted px-4 py-3 font-mono text-xs">{round.numbers.join(' · ')}</td>
                <td className="text-muted px-4 py-3 text-xs">{round.drawnAt.slice(0, 16)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
