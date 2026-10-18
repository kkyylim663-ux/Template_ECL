import Link from 'next/link';
import { regionPath } from '@/config/nav';
import { getT } from '@/lib/i18n/server';

type Entry = {
  id: string;
  /** Keys inside the `home` namespace. */
  titleKey: string;
  href: string;
  /** Artwork slug under `public/home/entry-<art>.webp`. */
  art: string;
  /** Gradient modifier: `.home-popular__card--<tone>`. */
  tone: 'number' | 'ranking' | 'prediction' | 'achievement';
};

const ENTRIES: Entry[] = [
  {
    id: 'numbergame',
    titleKey: 'entry.numberGame',
    href: '/numbergame',
    art: 'number-game',
    tone: 'number',
  },
  {
    id: 'ranking',
    titleKey: 'entry.ranking',
    href: '/ranking-board',
    art: 'ranking',
    tone: 'ranking',
  },
  {
    id: 'prediction',
    titleKey: 'entry.prediction',
    href: '/prediction',
    art: 'prediction',
    tone: 'prediction',
  },
  {
    id: 'personal',
    titleKey: 'entry.personal',
    href: '/account/achievement',
    art: 'achievement',
    tone: 'achievement',
  },
];

/**
 * The four quick entries (`.home-popular__wrapper`): one row of 318x70 gradient
 * cards on desktop, a 343-wide stack on mobile. The whole card is one link and
 * the "Play Now" pill inside it is the original's — visual only, it opens the
 * same section page.
 */
export async function EntryCards({ region }: { region: string }) {
  const { t } = await getT('home');

  return (
    <ul className="mb-[25px] flex flex-col gap-[10px] desktop:mb-[65px] desktop:flex-row">
      {ENTRIES.map((entry) => (
        <li key={entry.id} data-entry={entry.id} className="desktop:flex-1">
          <Link
            href={regionPath(region, entry.href)}
            style={{
              backgroundImage: `url(/home/entry-${entry.art}.webp)`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
            className={`entry-card entry-card--${entry.tone} text-ink flex h-[95px] items-center justify-between rounded-[var(--radius-panel)] px-4 desktop:px-3`}
          >
            <span className="flex items-center">
              <span className="grid size-[70px] shrink-0 place-items-center" />
              <span className="text-15 leading-[normal] font-medium desktop:text-lg leading-[normal]">
                {t(entry.titleKey)}
              </span>
            </span>
            {/* Padding and `normal` leading are the original's: 12/9px + 14/11px text. */}
            <span className="hover-grow shrink-0 whitespace-nowrap rounded-[var(--radius-panel)] bg-[var(--color-line-soft)] px-[15px] py-[9px] text-11 leading-[normal] leading-[normal] desktop:px-[14.5px] desktop:py-3 desktop:text-sm leading-[normal]">
              {t('entry.playNow')}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
