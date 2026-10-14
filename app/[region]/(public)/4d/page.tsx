import type { Metadata } from 'next';
import { getDisplayPayload } from '@/lib/api';
import { LaunchButton } from '@/components/game/LaunchButton';
import { RulesButton } from '@/components/ui/RulesButton';
import { InertLink } from '@/components/ui/InertLink';

export const metadata: Metadata = {
  title: '4D',
  description: 'Draw results and how the 4D game works.',
};

const FOUR_D_RULES =
  'Four draws a week (Wednesday, Saturday, Sunday and a special draw). Pick a 4-digit number and a bet type: Big, Small, 1+3D, 2+2D or 3+1D. Prize tiers are First, Second and Third, with consolation prizes for every other match. Results are published here and in your inbox.';

export default async function FourDPage() {
  const { fourD } = await getDisplayPayload();

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-ink text-xl font-semibold">4D</h1>
          <p className="text-muted mt-1 text-xs">Latest {fourD.length} draws</p>
        </div>
        <RulesButton title="4D rules" body={FOUR_D_RULES} />
      </header>

      <div className="border-line bg-panel mt-5 overflow-hidden rounded-[var(--radius-panel)] border">
        <table className="w-full text-left text-sm">
          <thead className="bg-panel-alt text-muted text-[11px] tracking-wide uppercase">
            <tr>
              <th className="px-4 py-3">Draw</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">First</th>
              <th className="px-4 py-3">Second</th>
              <th className="px-4 py-3">Third</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {fourD.map((draw) => (
              <tr key={draw.draw} className="border-line border-t">
                <td className="text-ink px-4 py-3 font-medium">#{draw.draw}</td>
                <td className="text-muted px-4 py-3">{draw.date}</td>
                <td className="text-accent px-4 py-3 font-mono font-semibold tracking-widest">
                  {draw.first}
                </td>
                <td className="text-ink px-4 py-3 font-mono tracking-widest">{draw.second}</td>
                <td className="text-ink px-4 py-3 font-mono tracking-widest">{draw.third}</td>
                <td className="px-4 py-3">
                  <LaunchButton
                    provider="4d"
                    gameId={draw.draw}
                    label="Play this draw"
                    variant="secondary"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-muted mt-4 text-xs">
        Historical results go back further than shown here.{' '}
        <InertLink className="text-accent hover:underline">See the full archive</InertLink> · entries
        are disabled in this build.
      </p>
    </div>
  );
}
