import Link from 'next/link';
import type { IconName } from '@/components/ui/Icon';
import { Icon } from '@/components/ui/Icon';
import { LaunchButton } from '@/components/game/LaunchButton';
import { regionPath } from '@/config/nav';

type Entry = {
  id: string;
  title: string;
  hint: string;
  href: string;
  icon: IconName;
  /** True when there is no real destination yet: the card link is inert too. */
  inert?: boolean;
};

const ENTRIES: Entry[] = [
  {
    id: 'numbergame',
    title: 'Number game',
    hint: 'A draw every five minutes',
    href: '/numbergame',
    icon: 'numbers',
  },
  {
    id: 'ranking',
    title: 'Ranking board',
    hint: 'Weekly turnover race',
    href: '/ranking-board',
    icon: 'trophy',
  },
  {
    id: 'prediction',
    title: 'Prediction',
    hint: 'Free entry, real prizes',
    href: '/prediction',
    icon: 'prediction',
  },
  {
    id: 'personal',
    title: 'Personal',
    hint: 'Your progress and rewards',
    href: '#',
    icon: 'achievement',
    inert: true,
  },
];

/** The four quick-entry cards on the home page. Play Now is inert by design. */
export function EntryCards({ region }: { region: string }) {
  return (
    <ul className="grid grid-cols-2 gap-3 desktop:grid-cols-4 desktop:gap-5">
      {ENTRIES.map((entry) => {
        const body = (
          <>
            <Icon name={entry.icon} size={26} className="text-accent" />
            <span className="text-ink mt-3 block text-sm font-semibold">{entry.title}</span>
            <span className="text-muted mt-0.5 block text-xs">{entry.hint}</span>
          </>
        );

        return (
          <li
            key={entry.id}
            data-entry={entry.id}
            className="group border-line bg-panel hover:border-accent rounded-[var(--radius-panel)] border p-4 transition-transform duration-200 hover:-translate-y-0.5"
          >
            {/*
              An inert entry renders no anchor at all rather than a link that
              cancels its own click: it has no destination yet.
            */}
            {entry.inert ? (
              <div>{body}</div>
            ) : (
              <Link href={regionPath(region, entry.href)} className="block">
                {body}
              </Link>
            )}

            <div className="mt-3">
              <LaunchButton provider={entry.id} label="Play Now" className="w-full" />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
