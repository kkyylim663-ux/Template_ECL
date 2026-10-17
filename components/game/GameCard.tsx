'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { GameCard as GameCardData } from '@/lib/api/slots';
import { getLaunchHref, type LaunchMode } from '@/lib/game/launch';
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
 * The click itself is answered by the grid through `onLaunch` (T61): Play Now
 * and Demo both resolve to the reference's pre-launch notice, which needs the
 * session and therefore lives one level up, next to the dialog it opens.
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
  const href = getLaunchHref({ provider: game.provider, gameId: game.id, mode: 'real' });
  const activate = (mode: LaunchMode) => (event: React.MouseEvent) => {
    if (href === '#') event.preventDefault();
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
      <span
        aria-hidden
        className="lobby-card__img game-placeholder"
        style={{ '--tone': String(toneFromString(game.id)) } as React.CSSProperties}
      />
      <div className="lobby-card__cover">
        <a
          href={href}
          data-game-id={game.id}
          data-provider={game.provider}
          data-mode="real"
          onClick={activate('real')}
          className="lobby-card__btn lobby-card__btn--play"
        >
          {t('card.playNow')}
        </a>
        <a
          href={href}
          data-game-id={game.id}
          data-provider={game.provider}
          data-mode="demo"
          onClick={activate('demo')}
          className="lobby-card__btn lobby-card__btn--demo mt-2.5"
        >
          {t('card.demo')}
        </a>
      </div>
      <h3 className="lobby-card__title text-sm leading-[normal] font-medium">{game.name}</h3>
    </article>
  );
}
