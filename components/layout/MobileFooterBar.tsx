import Link from 'next/link';
import { MOBILE_BAR_ITEMS, regionPath } from '@/config/nav';
import { Icon } from '@/components/ui/Icon';

/**
 * Fixed bottom bar for <=768px, per docs/UI_REFERENCE.md: panel background,
 * icon + label, z-index 12. AppShell reserves bottom space so it never covers
 * page content (the reference's `has-footer`).
 */
export function MobileFooterBar({ region }: { region: string }) {
  return (
    <nav
      aria-label="Quick navigation"
      className="border-line bg-panel fixed right-0 bottom-0 left-0 z-[12] flex items-stretch border-t desktop:hidden"
    >
      {MOBILE_BAR_ITEMS.map((item) => (
        <Link
          key={item.href || 'home'}
          href={regionPath(region, item.href)}
          className="text-muted active:text-accent flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]"
        >
          <Icon name={item.icon ?? 'home'} size={20} />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
