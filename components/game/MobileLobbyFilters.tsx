'use client';

import Link from 'next/link';
import { useState } from 'react';
import { regionPath } from '@/config/nav';
import { Icon } from '@/components/ui/Icon';
import type { TabItem } from '@/components/ui/Tabs';
import type { ProviderSummary } from '@/lib/api/slots';

type OpenMenu = 'provider' | 'tab' | null;

/**
 * Phone filters for the lobby (`.mobile-select__wrapper`, <=768px, measured from
 * crawl/mobile): a studio dropdown (flex 2) and a category dropdown (flex 1) side
 * by side on a #2d2d2f panel. The original has no studio strip or tab bar at this
 * width, so these take their place; desktop never renders them.
 */
export function MobileLobbyFilters({
  region,
  providers,
  provider,
  tabs,
  tab,
  onTabChange,
}: {
  region: string;
  providers: ProviderSummary[];
  provider: string;
  tabs: TabItem[];
  tab: string;
  onTabChange: (id: string) => void;
}) {
  const [open, setOpen] = useState<OpenMenu>(null);
  const slotsHref = regionPath(region, '/slots');
  const activeTab = tabs.find((item) => item.id === tab)?.label ?? tab;

  return (
    <div className="hidden max-desktop:mt-2.5 max-desktop:mb-[19px] max-desktop:flex max-desktop:gap-2.5 max-desktop:rounded-[15px] max-desktop:bg-[#2d2d2f] max-desktop:px-2.5 max-desktop:py-[11px]">
      <div className="relative flex-[2]">
        <button
          type="button"
          aria-expanded={open === 'provider'}
          onClick={() => setOpen(open === 'provider' ? null : 'provider')}
          className="flex w-full items-center justify-between rounded-[15px] bg-[#353537] px-2.5 py-[7px] text-xs font-medium text-white"
        >
          <span className="truncate">{provider}</span>
          <Icon name="chevronDown" size={12} className="shrink-0 text-muted" />
        </button>
        {open === 'provider' ? (
          <ul className="custom-scroll absolute inset-x-0 top-full z-10 mt-1 max-h-72 overflow-y-auto rounded-[15px] bg-[#1e2020] py-2.5 text-xs font-medium text-white">
            {providers.map((entry) => (
              <li key={entry.id}>
                <Link
                  href={`${slotsHref}?provider=${entry.id}&tab=${tab}`}
                  aria-current={entry.id === provider ? 'true' : undefined}
                  onClick={() => setOpen(null)}
                  className={`block px-[17px] py-2.5 ${entry.id === provider ? 'text-accent' : ''}`}
                >
                  {entry.id}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="relative flex-1">
        <button
          type="button"
          aria-expanded={open === 'tab'}
          onClick={() => setOpen(open === 'tab' ? null : 'tab')}
          className="flex w-full items-center justify-between rounded-[15px] bg-[#353537] px-2.5 py-[7px] text-xs font-medium text-white"
        >
          <span className="truncate">{activeTab}</span>
          <Icon name="chevronDown" size={12} className="shrink-0 text-muted" />
        </button>
        {open === 'tab' ? (
          <ul className="absolute inset-x-0 top-full z-10 mt-1 rounded-[15px] bg-[#1e2020] py-2.5 text-xs font-medium text-white">
            {tabs.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    onTabChange(item.id);
                    setOpen(null);
                  }}
                  className={`block w-full px-[17px] py-2.5 text-left ${item.id === tab ? 'text-accent' : ''}`}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
