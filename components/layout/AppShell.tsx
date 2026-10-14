import { DesktopSidebar } from './DesktopSidebar';
import { Footer } from './Footer';
import { Header } from './Header';
import { MobileChrome } from './MobileChrome';
import { MobileFooterBar } from './MobileFooterBar';

/**
 * Site chrome. One responsive template: >=769px renders the header + left rail +
 * footer, <=768px renders the mobile shell instead.
 */
export function AppShell({ region, children }: { region: string; children: React.ReactNode }) {
  return (
    <>
      <DesktopSidebar region={region} />

      <div className="flex min-h-dvh flex-col desktop:pl-[var(--sidebar-mini-width)]">
        <Header region={region} />
        <MobileChrome region={region} />

        {/* T11 mounts the announcement marquee here. */}

        {/* Bottom padding reserves room for the fixed mobile bar. */}
        <main className="flex-1 px-[var(--pad-page-x)] py-6 max-desktop:px-4 max-desktop:pb-20">
          {children}
        </main>

        <Footer region={region} />
      </div>

      <MobileFooterBar region={region} />
    </>
  );
}
