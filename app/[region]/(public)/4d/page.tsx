import type { Metadata } from 'next';
import { getDisplayPayload } from '@/lib/api';
import { LaunchButton } from '@/components/game/LaunchButton';
import { RulesButton } from '@/components/ui/RulesButton';
import { InertLink } from '@/components/ui/InertLink';
import { IntlScope } from '@/lib/i18n/scope';
import { getT } from '@/lib/i18n/server';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region } = await params;
  return pageMetadata('game4d', { region, path: '/4d' });
}

export default async function FourDPage() {
  const [{ t }, { fourD }] = await Promise.all([getT('games'), getDisplayPayload()]);

  return (
    <IntlScope namespaces={['games']}>
      <div>
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-ink text-xl font-semibold">{t('category.game4d')}</h1>
            <p className="text-muted mt-1 text-xs">{t('fourD.latest', { count: fourD.length })}</p>
          </div>
          <RulesButton title={t('fourD.rulesTitle')} body={t('fourD.rules')} />
        </header>

        <div className="border-line bg-panel mt-5 overflow-hidden rounded-[var(--radius-panel)] border">
          <table className="w-full text-left text-sm">
            <thead className="bg-panel-alt text-muted text-11 tracking-wide uppercase">
              <tr>
                <th className="px-4 py-3">{t('fourD.col.draw')}</th>
                <th className="px-4 py-3">{t('fourD.col.date')}</th>
                <th className="px-4 py-3">{t('fourD.col.first')}</th>
                <th className="px-4 py-3">{t('fourD.col.second')}</th>
                <th className="px-4 py-3">{t('fourD.col.third')}</th>
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
                      label={t('fourD.playDraw')}
                      variant="secondary"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-muted mt-4 text-xs">
          {t('fourD.archiveBefore')}{' '}
          <InertLink className="text-accent hover:underline">{t('fourD.archiveLink')}</InertLink>{' '}
          {t('fourD.archiveAfter')}
        </p>
      </div>
    </IntlScope>
  );
}
