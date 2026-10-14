'use client';

import { Icon } from './Icon';

export type TabItem = {
  id: string;
  label: string;
  /** Optional count shown next to the label, e.g. the number of games. */
  count?: number;
};

/**
 * Tabs are controlled on purpose: the slots page keeps the active tab in the URL
 * (T09), and the ranking board swaps tables by tab (T11).
 */
export function Tabs({
  tabs,
  value,
  onChange,
  label = 'Tabs',
  className,
}: {
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={`border-line flex gap-1 overflow-x-auto border-b pb-px ${className ?? ''}`}
    >
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-t-[10px] px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
              active
                ? 'border-accent text-accent -mb-px border-b-2'
                : 'text-muted hover:text-ink border-b-2 border-transparent'
            }`}
          >
            {tab.label}
            {typeof tab.count === 'number' ? (
              <span className="text-muted text-[10px]">({tab.count.toLocaleString('en-MY')})</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Small right-aligned entry point used on the game pages. */
export function TabChevron({ dir }: { dir: 'left' | 'right' }) {
  return <Icon name={dir === 'left' ? 'chevronLeft' : 'chevronRight'} size={16} />;
}
