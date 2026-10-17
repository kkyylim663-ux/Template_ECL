'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { regionPath } from '@/config/nav';
import type { HomeBetting } from '@/lib/api/schemas';
import { formatTimestamp } from '@/lib/format';

const BET_ICONS: Record<string, IconName> = {
  slots: 'slots',
  'live-casino': 'livecasino',
  sports: 'sports',
  esports: 'esports',
};

/** Amounts are integer minor units everywhere; USD is shown to 2 decimals. */
const usd = (minor: number) => (minor / 100).toFixed(2);

const TABS = ['allBets', 'topDailyWinner'] as const;

/**
 * "Betting Transaction" (`.home-section` + `.betting-transaction__*`): two pills
 * over a `.table-theme` table. The original fills these from a stream and keeps
 * ten rows; the same ten come from `mocks/home-betting.json` here.
 */
export function BettingTransaction({
  betting,
  region,
}: {
  betting: HomeBetting;
  region: string;
}) {
  const t = useTranslations('home');
  const [tab, setTab] = useState<(typeof TABS)[number]>('allBets');
  const panelId = 'home-betting-panel';

  return (
    // The block is full-bleed on mobile; the original insets an inner `has-space`
    // wrapper instead (16px only <=768px, so desktop needs the reset).
    <section className="home-section bleed-mobile" data-betting-transaction>
      <div className="mx-[var(--pad-mobile-x)] desktop:mx-0">
        <h2 className="section-title">{t('section.betting')}</h2>

        <div data-betting-tabs className="mb-[27px] flex items-center justify-between">
          <div
            role="tablist"
            aria-label={t('section.betting')}
            className="flex flex-1 overflow-x-auto"
          >
            {TABS.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`home-betting-tab-${id}`}
                aria-selected={tab === id}
                aria-controls={panelId}
                onClick={() => setTab(id)}
                className="pill-tab me-4 last:me-0"
              >
                {t(`betting.${id}`)}
              </button>
            ))}
          </div>
          <Link
            href={regionPath(region, '/ranking-board')}
            className="text-ink hover:text-accent hidden text-sm leading-[normal] font-bold desktop:inline"
          >
            {t('betting.viewMore')}
          </Link>
        </div>

        {/* The original keeps its 1000px/800px table and scrolls it sideways.
            T76: a scroll region needs keyboard access — the panel itself is the
            tab stop, which is also the recommended tabpanel behaviour. */}
        <div
          role="tabpanel"
          id={panelId}
          aria-labelledby={`home-betting-tab-${tab}`}
          tabIndex={0}
          className="overflow-x-auto"
        >
          {tab === 'allBets' ? (
            <AllBetsTable betting={betting} />
          ) : (
            <WinnersTable betting={betting} />
          )}
        </div>
      </div>
    </section>
  );
}

function AllBetsTable({ betting }: { betting: HomeBetting }) {
  const t = useTranslations('home');

  return (
    <table className="table-theme w-full max-desktop:w-[1000px]">
      <thead>
        <tr>
          <th className="w-[250px] pl-20">{t('betting.col.game')}</th>
          <th className="w-[280px] max-desktop:w-[240px]">{t('betting.col.nickname')}</th>
          <th className="w-[200px] max-desktop:w-[130px]">{t('betting.col.time')}</th>
          <th className="w-[200px] max-desktop:w-[130px]">{t('betting.col.region')}</th>
          <th>{t('betting.col.amount')}</th>
        </tr>
      </thead>
      <tbody>
        {betting.allBets.map((bet) => (
          <tr key={bet.id}>
            <td className="flex pl-12">
              <Icon name={BET_ICONS[bet.type] ?? 'slots'} size={20} className="mr-4" />
              {t(`bet.${bet.type}`)}
            </td>
            <td>{bet.account}</td>
            <td>{formatTimestamp(bet.betAt)}</td>
            <td>{bet.region}</td>
            <td>{usd(bet.usdBetMinor)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function WinnersTable({ betting }: { betting: HomeBetting }) {
  const t = useTranslations('home');

  return (
    <table className="table-theme w-full max-desktop:w-[800px]">
      <thead>
        <tr>
          <th className="w-[150px] pl-12">{t('betting.col.place')}</th>
          <th className="w-[300px] max-desktop:w-[200px]">{t('betting.col.nickname')}</th>
          <th className="max-desktop:w-[150px]">{t('betting.col.region')}</th>
          <th>{t('betting.col.amount')}</th>
        </tr>
      </thead>
      <tbody>
        {betting.topDailyWinner.map((winner) => (
          <tr key={winner.rank}>
            <td>#{winner.rank}</td>
            <td>{winner.account}</td>
            <td>{winner.region}</td>
            <td>{usd(winner.usdWinMinor)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
