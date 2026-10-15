import Link from 'next/link';
import { Icon, type IconName } from '@/components/ui/Icon';
import { regionPath } from '@/config/nav';
import { getT } from '@/lib/i18n/server';

type Category = { href: string; labelKey: string; icon: IconName };

/** `.home-game__category-container`, in the original's order. */
const CATEGORIES: Category[] = [
  { href: '/esports', labelKey: 'category.esports', icon: 'esports' },
  { href: '/sports', labelKey: 'category.sports', icon: 'sports' },
  { href: '/livecasino', labelKey: 'category.livecasino', icon: 'livecasino' },
  { href: '/slots', labelKey: 'category.slots', icon: 'slots' },
  { href: '/fast-game', labelKey: 'category.fastGame', icon: 'fast' },
  { href: '/4d', labelKey: 'category.game4d', icon: 'dice4d' },
  { href: '/vip', labelKey: 'category.vip', icon: 'crown' },
  { href: '/sponsor', labelKey: 'category.sponsor', icon: 'sponsor' },
];

/**
 * Mobile-only game strip under the hero (`.home-game__category-wrapper`): eight
 * 20px icons in a 4-column grid, each in a 63x39 cell. Desktop never renders it.
 */
export async function CategoryStrip({ region }: { region: string }) {
  const { t } = await getT('home');

  return (
    <div className="bleed-mobile border-accent mt-4 rounded-tl-[20px_12px] rounded-tr-[20px_12px] border-t py-[22px] desktop:hidden">
      <ul className="grid grid-cols-4 gap-[30px] px-[var(--pad-mobile-x)]">
        {CATEGORIES.map((category) => (
          <li key={category.href}>
            <Link
              href={regionPath(region, category.href)}
              className="text-ink flex flex-col items-center justify-center text-11 leading-[normal]"
            >
              <Icon name={category.icon} size={20} className="mb-[6px]" />
              <span className="text-center">{t(category.labelKey)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
