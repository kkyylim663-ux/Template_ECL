'use client';

import { Icon } from './Icon';

export type TabItem = {
  id: string;
  label: string;
  /** Optional count shown next to the label, e.g. the number of games. */
  count?: number;
};

/**
 * The original's `.nav-pill` tabs: #5d5d61 pills, 13.5px/700, 12px/16px padding,
 * 18px apart (6px at <=768px), `all .3s`; the selected one turns mustard with
 * black text. They scroll sideways inside the lobby bar instead of drawing an
 * underline. Controlled on purpose: the slots page keeps the active tab in the
 * URL (T09), and the ranking board swaps tables by tab (T11).
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
      className={`lobby-scroll flex min-w-0 gap-[18px] overflow-x-auto max-desktop:gap-1.5 ${className ?? ''}`}
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
            className={`flex shrink-0 items-center gap-3 rounded-[var(--radius-panel)] px-4 py-3 text-135 leading-[normal] font-bold whitespace-nowrap transition-all ${
              active
                ? 'bg-accent text-black'
                : 'bg-[var(--color-line-deepest)] text-white hover:bg-accent hover:text-black'
            } max-desktop:justify-center max-desktop:px-[18px] max-desktop:py-[7px] max-desktop:text-xs max-desktop:font-medium`}
          >
            {tab.label}
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
