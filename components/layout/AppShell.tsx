import { DesktopSidebar } from './DesktopSidebar';
import { Footer } from './Footer';
import { Header } from './Header';

/**
 * Site chrome. One responsive template: >=769px renders the header + left rail +
 * footer, <=768px renders the mobile shell (added in T06) instead.
 */
export function AppShell({ region, children }: { region: string; children: React.ReactNode }) {
  return (
    <>
      <DesktopSidebar region={region} />

      <div className="flex min-h-dvh flex-col desktop:pl-[var(--sidebar-mini-width)]">
        <Header region={region} />

        {/* T06 mounts MobileHeader / Drawer / MobileFooterBar / app banner here. */}
        {/* T11 mounts the announcement marquee here. */}

        <main className="flex-1 px-[var(--pad-page-x)] py-6 max-desktop:px-4">{children}</main>

        <Footer region={region} />
      </div>
    </>
  );
}
