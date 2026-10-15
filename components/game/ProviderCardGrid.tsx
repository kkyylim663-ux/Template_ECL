'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { getLaunchHref } from '@/lib/game/launch';
import { toneFromString } from '@/lib/game/tone';
import { VpnModal } from './VpnModal';
import type { VpnDemo } from '@/lib/api';

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
 */
export function ProviderCardGrid({
  providers,
  category,
  vpnNotice = false,
  vpnDemo,
}: {
  providers: ProviderCard[];
  category: string;
  vpnNotice?: boolean;
  /** Shown in the VPN dialog; required when `vpnNotice` is set. */
  vpnDemo?: VpnDemo;
}) {
  const t = useTranslations('games');
  const [revealed, setRevealed] = useState(false);
  const [vpnOpen, setVpnOpen] = useState(false);

  return (
    <ul className="game-wrapper" data-category={category}>
      {providers.map((provider) => (
        <li key={provider.id}>
          <article
            data-provider={provider.id}
            data-category={category}
            data-revealed={revealed}
            onClick={() => setRevealed(true)}
            className="game-card"
          >
            <div className="game-card__visual">
              <span
                aria-hidden
                className="game-card__img game-placeholder text-11 leading-[normal] font-semibold tracking-wide text-white/85"
                style={{ '--tone': String(toneFromString(provider.id)) } as React.CSSProperties}
              >
                {provider.id}
              </span>
              {provider.isNew ? <span className="game-card__label-new">New</span> : null}

              <div className="game-card__panel">
                <span
                  aria-hidden
                  className="game-card__panel-preview game-placeholder"
                  style={{ '--tone': String(toneFromString(provider.id)) } as React.CSSProperties}
                />
                <div className="game-card__panel-footer">
                  <span className="text-sm leading-[normal]">{provider.id}</span>
                  <a
                    href={getLaunchHref({ provider: provider.id, gameId: category, mode: 'real' })}
                    data-game-id={provider.id}
                    data-provider={provider.id}
                    data-mode="real"
                    onClick={(event) => {
                      // The launch seam always yields `#`; keep the click inert.
                      event.preventDefault();
                      event.stopPropagation();
                      if (vpnNotice && vpnDemo) setVpnOpen(true);
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
      ))}

      {vpnOpen && vpnDemo ? <VpnModal demo={vpnDemo} onClose={() => setVpnOpen(false)} /> : null}
    </ul>
  );
}
