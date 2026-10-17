'use client';

import dynamic from 'next/dynamic';
import { useIsMobile } from '@/lib/use-is-mobile';

/*
 * T71: the two shells are one responsive tree (CSS hides the wrong breakpoint),
 * so the split is on the JS side — each gate below mounts its island only on
 * the breakpoint that shows it. A phone never requests the desktop shell's
 * chunk and a desktop never requests the phone's; the chunk a visitor does need
 * arrives right after hydration. The rendered tree is unchanged: every gate
 * renders exactly what the ungated component did.
 *
 * `ssr: false` is deliberate — gated chrome is CSS-hidden on the other
 * breakpoint anyway, and SSR has no viewport (see lib/use-is-mobile.ts).
 */
const DesktopSidebar = dynamic(() => import('./DesktopSidebar').then((mod) => mod.DesktopSidebar), {
  ssr: false,
});
const HeaderMenu = dynamic(() => import('./HeaderMenu').then((mod) => mod.HeaderMenu), {
  ssr: false,
});
const AccountSlot = dynamic(() => import('./AccountSlot').then((mod) => mod.AccountSlot), {
  ssr: false,
});
const MobileChrome = dynamic(() => import('./MobileChrome').then((mod) => mod.MobileChrome), {
  ssr: false,
});
const MobileFooterBar = dynamic(
  () => import('./MobileFooterBar').then((mod) => mod.MobileFooterBar),
  { ssr: false },
);

/** Desktop rail + sliding panel (`.sidebar2`); hidden on phones. */
export function DesktopSidebarGate({ region }: { region: string }) {
  return useIsMobile() ? null : <DesktopSidebar region={region} />;
}

/** Desktop primary menu (the header's three mega-menu cards); hidden on phones. */
export function HeaderMenuGate({ region }: { region: string }) {
  return useIsMobile() ? null : <HeaderMenu region={region} />;
}

/** Header account slot (balance / unread badge); the mobile header has its own. */
export function AccountSlotGate({ region }: { region: string }) {
  return useIsMobile() ? null : <AccountSlot region={region} />;
}

/** Mobile top stack — download banner, 56px header, drawer; hidden on desktop. */
export function MobileChromeGate({ region }: { region: string }) {
  return useIsMobile() ? <MobileChrome region={region} /> : null;
}

/** Mobile floating bottom bar; hidden on desktop. */
export function MobileFooterBarGate({ region }: { region: string }) {
  return useIsMobile() ? <MobileFooterBar region={region} /> : null;
}
