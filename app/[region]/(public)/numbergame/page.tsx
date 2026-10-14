import type { Metadata } from 'next';
import { getDisplayPayload } from '@/lib/api';
import { LaunchButton } from '@/components/game/LaunchButton';
import { InertLink } from '@/components/ui/InertLink';
import { RulesButton } from '@/components/ui/RulesButton';
import { IntlScope } from '@/lib/i18n/scope';
import { getT } from '@/lib/i18n/server';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region } = await params;
  return pageMetadata('numberGame', { region, path: '/numbergame' });
}

export default async function NumberGamePage() {
  const [{ t }, { numberGame }] = await Promise.all([getT('games'), getDisplayPayload()]);
  const rounds = [
    { round: numberGame.round, numbers: numberGame.numbers, drawnAt: numberGame.drawnAt },
    ...numberGame.history,
  ];

  return (
    <IntlScope namespaces={['games']}>
      <div>
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-ink text-xl font-semibold">{t('category.numberGame')}</h1>
            <p className="text-muted mt-1 text-xs">
              {t('numberGame.round', {
                round: numberGame.round,
                time: numberGame.drawnAt.slice(11, 16),
              })}
            </p>
          </div>
          <RulesButton title={t('numberGame.rulesTitle')} body={t('numberGame.rules')} />
        </header>

        <div className="border-line bg-panel mt-5 rounded-[var(--radius-panel)] border p-5">
          <p className="text-muted text-[11px] tracking-widest uppercase">
            {t('numberGame.latest')}
          </p>
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
            <LaunchButton provider="numbergame" label={t('numberGame.playNext')} />
            <InertLink className="text-accent text-xs hover:underline">
              {t('numberGame.verify')}
            </InertLink>
          </div>
        </div>

        <h2 className="text-ink mt-8 text-sm font-semibold">{t('numberGame.recent')}</h2>
        <div className="border-line bg-panel mt-3 overflow-hidden rounded-[var(--radius-panel)] border">
          <table className="w-full text-left text-sm">
            <thead className="bg-panel-alt text-muted text-[11px] tracking-wide uppercase">
              <tr>
                <th className="px-4 py-3">{t('numberGame.col.round')}</th>
                <th className="px-4 py-3">{t('numberGame.col.numbers')}</th>
                <th className="px-4 py-3">{t('numberGame.col.drawnAt')}</th>
              </tr>
            </thead>
            <tbody>
              {rounds.map((round) => (
                <tr key={round.round} className="border-line border-t">
                  <td className="text-ink px-4 py-3 font-mono text-xs">{round.round}</td>
                  <td className="text-muted px-4 py-3 font-mono text-xs">
                    {round.numbers.join(' · ')}
                  </td>
                  <td className="text-muted px-4 py-3 text-xs">{round.drawnAt.slice(0, 16)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </IntlScope>
  );
}
