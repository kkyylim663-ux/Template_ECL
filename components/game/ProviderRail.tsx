import Link from 'next/link';
import type { ProviderSummary } from '@/lib/api/slots';
import { regionPath } from '@/config/nav';

/**
 * Provider strip above the slots grid. Server-rendered links, so switching a
 * studio is a normal navigation and none of the 6121 games ship to the browser.
 * Horizontally scrollable, as in the reference build.
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
    <div className="-mx-4 overflow-x-auto px-4 desktop:mx-0 desktop:px-0">
      <ul className="flex w-max gap-2 pb-2">
        {providers.map((provider) => {
          const isActive = provider.id === active;
          const href = `${regionPath(region, '/slots')}?provider=${provider.id}&tab=${tab}`;
          return (
            <li key={provider.id}>
              <Link
                href={href}
                aria-current={isActive ? 'true' : undefined}
                className={`block rounded-[var(--radius-tag)] border px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-accent bg-panel-soft text-accent'
                    : 'border-line text-muted hover:border-accent hover:text-ink'
                }`}
              >
                {provider.id}
                <span className="text-muted ml-1.5 text-10">
                  {provider.totalGames.toLocaleString('en-MY')}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
