'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { GameCard as GameCardData } from '@/lib/api/slots';
import { getLaunchHref } from '@/lib/game/launch';
import { toneFromString } from '@/lib/game/tone';

/**
 * One game tile (`.gamelist-display__card`): 250px tall (3/4 at <=768px), 15px
 * radius; the artwork scales to 1.2 on hover while a rgba(0,0,0,.8) cover slides
 * up (`all .3s`) holding Play Now (`.btn-primary` mustard) over Demo (plain
 * `.btn`, #2d2d2f). Both actions are `#` and never navigate. Hover (and
 * `:focus-within` for the keyboard) drives the cover on desktop; on touch, the
 * first tap on the tile reveals it (the original's mobile interaction is not in
 * the snapshot — P0's tap-to-reveal is kept, mobile.spec locks it).
 */
export function GameCard({ game }: { game: GameCardData }) {
  const t = useTranslations('games');
  const [revealed, setRevealed] = useState(false);
  const href = getLaunchHref({ provider: game.provider, gameId: game.id, mode: 'real' });
  const keep = (event: React.MouseEvent) => {
    if (href === '#') event.preventDefault();
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
          onClick={keep}
          className="lobby-card__btn lobby-card__btn--play"
        >
          {t('card.playNow')}
        </a>
        <a
          href={href}
          data-game-id={game.id}
          data-provider={game.provider}
          data-mode="demo"
          onClick={keep}
          className="lobby-card__btn lobby-card__btn--demo mt-2.5"
        >
          {t('card.demo')}
        </a>
      </div>
      <h3 className="lobby-card__title text-sm leading-[normal] font-medium">{game.name}</h3>
    </article>
  );
}
