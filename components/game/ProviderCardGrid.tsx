'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { getLaunchHref, type LaunchBlock } from '@/lib/game/launch';
import { isGameProvider, providerConfig } from '@/config/providers';
import { toneFromString } from '@/lib/game/tone';
import { LaunchGateModal } from './LaunchGateModal';
import { VpnModal } from './VpnModal';
import type { VpnDemo } from '@/lib/api';

/**
 * The studio logos pulled from the original site (`public/providers/<name>.webp`,
 * 19 tiles: live casino 13, sports 2, esports 4 — the esports strip reuses the
 * sports pair). BRAND Sports is ECL's own studio, deliberately left out of the
 * pull, so it keeps the text fallback.
 */
const CLUB_LOGOS = new Set([
  'Evolution Asia',
  'PP Club',
  'PT Club',
  'Winfinity Club',
  'On Live',
  'Allbet Club',
  'DG Club',
  'SG Club',
  'Choice Club',
  'Ezugi Club',
  'GP Club',
  'WM Club',
  'Creedroomz',
  'Saba Sport',
  'CMD368 Sports',
  'Saba-Esports',
  'Inplay Matrix',
  'TFGaming',
  'IA Gaming',
]);

export type ProviderCard = {
  id: string;
  /** Wears the red "New" corner tag (`.game-card__label.new`). */
  isNew: boolean;
};

/**
 * Studio cards for the live casino / sports / esports pages
 * (`.game-wrapper` + `.game-card`): a .735/1 logo tile that lifts 2px with a
 * mustard border on hover, and a 361px black preview panel (Play button in the
 * footer) that scales in over the neighbours — right-anchored for the last two
 * columns so it never leaves the viewport. The title sits under the tile;
 * mobile flattens both away (2.42/1 logo card only).
 *
 * Clicking Play opens the VPN dialog on livecasino/esports (`vpnNotice`), the
 * same dead end the reference build has — nothing launches.
 *
 * T62 adds the provider registry's answer in front of that: a studio it marks
 * under maintenance wears `.game-card__label` instead of the New tag and
 * answers its Play click with the maintenance dialog, which — unlike the VPN
 * notice — needs no demo credentials and no session.
 */
export function ProviderCardGrid({
  providers,
  category,
  region,
  vpnNotice = false,
  vpnDemo,
}: {
  providers: ProviderCard[];
  category: string;
  region: string;
  vpnNotice?: boolean;
  /** Shown in the VPN dialog; required when `vpnNotice` is set. */
  vpnDemo?: VpnDemo;
}) {
  const t = useTranslations('games');
  const [revealed, setRevealed] = useState(false);
  const [vpnOpen, setVpnOpen] = useState(false);
  const [blocked, setBlocked] = useState<LaunchBlock | null>(null);

  return (
    <ul className="game-wrapper" data-category={category}>
      {providers.map((provider) => {
        const config = providerConfig(provider.id);
        const launch = getLaunchHref({ provider: provider.id, gameId: category, mode: 'real' });

        return (
          <li key={provider.id}>
            <article
              data-provider={provider.id}
              data-category={category}
              data-revealed={revealed}
              onClick={() => setRevealed(true)}
              className="game-card"
            >
              <div
                className="game-card__visual"
                style={{
                  backgroundImage: 'url(/games/card-bg.webp)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {isGameProvider(provider.id) || CLUB_LOGOS.has(provider.id) ? (
                  <img
                    src={`/providers/${provider.id}.webp`}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="game-card__img"
                  />
                ) : (
                  // BRAND Sports is the one club without pulled artwork: text.
                  <span
                    aria-hidden
                    className="game-card__img text-11 leading-[normal] font-semibold tracking-wide text-white/85"
                  >
                    {provider.id}
                  </span>
                )}
                {config.underMaintenance ? (
                  <span className="game-card__label">{t('card.underMaintenance')}</span>
                ) : provider.isNew ? (
                  <span className="game-card__label-new">New</span>
                ) : null}

                <div className="game-card__panel">
                  <span
                    aria-hidden
                    className="game-card__panel-preview game-placeholder"
                    style={{ '--tone': String(toneFromString(provider.id)) } as React.CSSProperties}
                  />
                  <div className="game-card__panel-footer">
                    <span className="text-sm leading-[normal]">{provider.id}</span>
                    <a
                      href={launch.href}
                      data-game-id={provider.id}
                      data-provider={provider.id}
                      data-mode="real"
                      onClick={(event) => {
                        // The launch seam yields `#` for every blocked or
                        // unlaunched click; keep it inert and answer instead.
                        event.preventDefault();
                        event.stopPropagation();
                        if (launch.status !== 'ready') {
                          setBlocked(launch.status);
                        } else if (vpnNotice && vpnDemo) {
                          setVpnOpen(true);
                        }
                      }}
                      className="lobby-card__btn lobby-card__btn--play"
                    >
                      {t('card.playNow')}
                    </a>
                  </div>
                </div>
              </div>
              <h3 className="game-card__title">{provider.id}</h3>
            </article>
          </li>
        );
      })}

      {vpnOpen && vpnDemo ? <VpnModal demo={vpnDemo} onClose={() => setVpnOpen(false)} /> : null}
      {blocked ? (
        <LaunchGateModal gate={blocked} region={region} onClose={() => setBlocked(null)} />
      ) : null}
    </ul>
  );
}
