import Link from 'next/link';
import type { IconName } from '@/components/ui/Icon';
import { Icon } from '@/components/ui/Icon';
import { LaunchButton } from '@/components/game/LaunchButton';
import { regionPath } from '@/config/nav';
import { getT } from '@/lib/i18n/server';

type Entry = {
  id: string;
  /** Keys inside the `home` namespace. */
  titleKey: string;
  hintKey: string;
  href: string;
  icon: IconName;
  /** True when there is no real destination yet: the card link is inert too. */
  inert?: boolean;
};

const ENTRIES: Entry[] = [
  {
    id: 'numbergame',
    titleKey: 'entry.numberGame',
    hintKey: 'entry.numberGameHint',
    href: '/numbergame',
    icon: 'numbers',
  },
  {
    id: 'ranking',
    titleKey: 'entry.ranking',
    hintKey: 'entry.rankingHint',
    href: '/ranking-board',
    icon: 'trophy',
  },
  {
    id: 'prediction',
    titleKey: 'entry.prediction',
    hintKey: 'entry.predictionHint',
    href: '/prediction',
    icon: 'prediction',
  },
  {
    id: 'personal',
    titleKey: 'entry.personal',
    hintKey: 'entry.personalHint',
    href: '#',
    icon: 'achievement',
    inert: true,
  },
];

/** The four quick-entry cards on the home page. Play Now is inert by design. */
export async function EntryCards({ region }: { region: string }) {
  const { t } = await getT('home');

  return (
    <ul className="grid grid-cols-2 gap-3 desktop:grid-cols-4 desktop:gap-5">
      {ENTRIES.map((entry) => {
        const body = (
          <>
            <Icon name={entry.icon} size={26} className="text-accent" />
            <span className="text-ink mt-3 block text-sm font-semibold">{t(entry.titleKey)}</span>
            <span className="text-muted mt-0.5 block text-xs">{t(entry.hintKey)}</span>
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
              <LaunchButton provider={entry.id} label={t('entry.playNow')} className="w-full" />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
