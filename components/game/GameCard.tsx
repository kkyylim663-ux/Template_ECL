'use client';

import { useState } from 'react';
import type { GameCard as GameCardData } from '@/lib/api/slots';
import { artUrl } from '@/lib/game/art';
import { getLaunchHref } from '@/lib/game/launch';
import { toneFromString } from '@/lib/game/tone';
import { LazyImage } from '@/components/ui/LazyImage';

/**
 * One game tile, matching docs/UI_REFERENCE.md: lazy artwork, accent border and
 * a 2px lift on hover, Play Now / Demo revealed on hover — or on a single tap
 * where there is no hover. Both actions are `#` in P0 and never navigate.
 */
export function GameCard({ game }: { game: GameCardData }) {
  const [revealed, setRevealed] = useState(false);
  const href = getLaunchHref({ provider: game.provider, gameId: game.id, mode: 'real' });
  const art = artUrl(game.provider, game.img);

  return (
    <article
      data-game-id={game.id}
      data-provider={game.provider}
      className="group border-line bg-panel hover:border-accent relative rounded-[var(--radius-panel)] border p-2 transition-transform duration-200 hover:-translate-y-0.5"
    >
      <LazyImage
        src={art}
        alt={game.name}
        tone={toneFromString(game.id)}
        className="rounded-[10px]"
      >
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55 transition-opacity ${
            revealed ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <a
            href={href}
            data-game-id={game.id}
            data-provider={game.provider}
            data-mode="real"
            onClick={(event) => {
              if (href === '#') event.preventDefault();
            }}
            className="bg-accent w-4/5 rounded-[8px] px-3 py-1.5 text-center text-xs font-semibold text-[#1b1b1b]"
          >
            Play Now
          </a>
          <a
            href={href}
            data-game-id={game.id}
            data-provider={game.provider}
            data-mode="demo"
            onClick={(event) => {
              if (href === '#') event.preventDefault();
            }}
            className="border-accent text-accent w-4/5 rounded-[8px] border px-3 py-1.5 text-center text-xs font-semibold"
          >
            Demo
          </a>
        </div>
      </LazyImage>

      {/* Touch devices have no hover: the first tap reveals the actions. */}
      {revealed ? null : (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          aria-label={`Show actions for ${game.name}`}
          className="absolute inset-x-2 top-2 bottom-8 z-10 rounded-[10px] desktop:hidden"
        />
      )}

      <h3 className="text-ink mt-3.5 line-clamp-2 text-center text-[15px] leading-tight font-semibold">
        {game.name}
      </h3>
    </article>
  );
}
