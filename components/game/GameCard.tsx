'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { GameCard as GameCardData } from '@/lib/api/slots';
import { providerConfig } from '@/config/providers';
import { getLaunchHref, LAUNCH_HREF, type LaunchMode } from '@/lib/game/launch';
import { toneFromString } from '@/lib/game/tone';

/**
 * One game tile (`.gamelist-display__card`): 250px tall (3/4 at <=768px), 15px
 * radius; the artwork scales to 1.2 on hover while a rgba(0,0,0,.8) cover slides
 * up (`all .3s`) holding Play Now (`.btn-primary` mustard) over Demo (plain
 * `.btn`, #2d2d2f). Both actions are `#` and never navigate. Hover (and
 * `:focus-within` for the keyboard) drives the cover on desktop; on touch, the
 * first tap on the tile reveals it (the original's mobile interaction is not in
 * the snapshot — P0's tap-to-reveal is kept, mobile.spec locks it).
 *
 * Artwork: the pulled cover (`game.cover` -> `public/games/<file>`) when one
 * exists (only each provider's catalogue tail was pulled from the original),
 * and the generated `hot-N` poster (keyed off the game id) otherwise.
 *
 * The click itself is answered by the grid through `onLaunch` (T61): Play Now
 * and Demo both resolve to the reference's pre-launch notice, which needs the
 * session and therefore lives one level up, next to the dialog it opens.
 *
 * T62 reads the studio's flags off the provider registry: a studio under
 * maintenance wears the corner tag (`.game-card__label.slots`, the reference's
 * label at its slot-card size) and one without a Demo action does not render
 * Demo at all — the reference's `tpl-if="${d.demoPlay != false}"`.
 */
export function GameCard({
  game,
  onLaunch,
}: {
  game: GameCardData;
  onLaunch?: (mode: LaunchMode) => void;
}) {
  const t = useTranslations('games');
  const [revealed, setRevealed] = useState(false);
  const config = providerConfig(game.provider);
  const play = getLaunchHref({ provider: game.provider, gameId: game.id, mode: 'real' });
  const demo = getLaunchHref({ provider: game.provider, gameId: game.id, mode: 'demo' });
  const activate = (mode: LaunchMode) => (event: React.MouseEvent) => {
    if ((mode === 'real' ? play : demo).href === LAUNCH_HREF) event.preventDefault();
    onLaunch?.(mode);
  };

  return (
    <article
      data-game-id={game.id}
      data-provider={game.provider}
      data-revealed={revealed}
      onClick={() => setRevealed(true)}
      className="lobby-card group"
    >
      <img
        src={
          game.cover
            ? `/games/${game.cover}`
            : `/games/hot-${(toneFromString(game.id) % 8) + 1}.webp`
        }
        alt=""
        loading="lazy"
        decoding="async"
        className="lobby-card__img object-cover"
      />
      {config.underMaintenance ? (
        <span className="game-card__label slots">{t('card.underMaintenance')}</span>
      ) : null}
      <div className="lobby-card__cover">
        <a
          href={play.href}
          data-game-id={game.id}
          data-provider={game.provider}
          data-mode="real"
          onClick={activate('real')}
          className="lobby-card__btn lobby-card__btn--play"
        >
          {t('card.playNow')}
        </a>
        {config.supportsDemo ? (
          <a
            href={demo.href}
            data-game-id={game.id}
            data-provider={game.provider}
            data-mode="demo"
            onClick={activate('demo')}
            className="lobby-card__btn lobby-card__btn--demo mt-2.5"
          >
            {t('card.demo')}
          </a>
        ) : null}
      </div>
      <h3 className="lobby-card__title text-sm leading-[normal] font-medium">{game.name}</h3>
    </article>
  );
}
