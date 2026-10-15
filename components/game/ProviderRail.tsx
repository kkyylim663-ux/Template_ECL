import Link from 'next/link';
import type { ProviderSummary } from '@/lib/api/slots';
import { regionPath } from '@/config/nav';

/**
 * The studio strip above the slots grid (`.gamelist-wrapper` + `.gamelist-card`):
 * 176x55 tiles that wrap onto rows on desktop, a sideways scroll at <=768px, and
 * the selected/hovered tile gets the accent border. Server-rendered links, so
 * switching a studio is a normal navigation and none of the 6121 games ship to
 * the browser. The artwork slot keeps the tile's 10px/20px inner padding.
 */
export function ProviderRail({
  region,
  providers,
  active,
  tab,
}: {
  region: string;
  providers: ProviderSummary[];
  active: string;
  tab: string;
}) {
  return (
    <ul className="lobby-rail lobby-scroll">
      {providers.map((provider) => {
        const isActive = provider.id === active;
        const href = `${regionPath(region, '/slots')}?provider=${provider.id}&tab=${tab}`;
        return (
          <li key={provider.id}>
            <Link
              href={href}
              aria-current={isActive ? 'true' : undefined}
              className="lobby-rail__card"
            >
              {/* Artwork slot: the tile's inner box (10px/20px padding is on it). */}
              <span
                aria-hidden
                className="lobby-rail__img game-placeholder text-11 leading-[normal] font-semibold tracking-wide text-white/85"
                style={{ '--tone': String(provider.id.length % 36) } as React.CSSProperties}
              >
                {provider.id.toUpperCase()}
              </span>
              <span className="sr-only">
                {provider.id} · {provider.totalGames.toLocaleString('en-MY')}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
