import Link from 'next/link';
import type { ProviderSummary } from '@/lib/api/slots';
import { regionPath } from '@/config/nav';
import { toneFromString } from '@/lib/game/tone';

/**
 * Studio wall: one compact tile per provider, each linking into the slots lobby
 * already filtered to that studio. Server-rendered — 28 links cost no client JS.
 */
export function ProviderWall({
  providers,
  region,
  limit = 28,
}: {
  providers: ProviderSummary[];
  region: string;
  limit?: number;
}) {
  const shown = providers.slice(0, limit);

  return (
    <ul className="grid grid-cols-3 gap-2.5 desktop:grid-cols-7 desktop:gap-4">
      {shown.map((provider) => (
        <li key={provider.id}>
          <Link
            href={`${regionPath(region, '/slots')}?provider=${provider.id}&tab=all`}
            className="group border-line bg-panel hover:border-accent flex h-full flex-col items-center gap-2 rounded-[var(--radius-panel)] border p-3 text-center transition-transform duration-200 hover:-translate-y-0.5"
          >
            <span
              aria-hidden
              className="game-placeholder grid size-10 place-items-center rounded-[10px] text-[10px] font-semibold text-white/85"
              style={{ '--tone': String(toneFromString(provider.id)) } as React.CSSProperties}
            >
              {provider.id.slice(0, 2).toUpperCase()}
            </span>
            <span className="text-ink w-full truncate text-[11px] font-medium">{provider.id}</span>
            <span className="text-muted text-[10px]">
              {provider.totalGames.toLocaleString('en-MY')}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
