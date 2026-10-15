import { DesktopSidebar } from './DesktopSidebar';
import { Footer } from './Footer';
import { Header } from './Header';
import { MobileChrome } from './MobileChrome';
import { MobileFooterBar } from './MobileFooterBar';

/**
 * Site chrome. One responsive template: >=769px renders the header + left rail +
 * footer, <=768px renders the mobile shell instead.
 *
 * Desktop geometry follows the original: the header is fixed at the top (so the
 * content is offset by its 78px) and every full-width section — header, main,
 * footer — is a centred 1300px `.container-page`. The 62px rail floats over the
 * left margin rather than pushing the content, as it does on the original.
 *
 * The site-wide announcement marquee P0 shipped is not part of the original
 * shell (no ticker element or ticker CSS in crawl/), so it is no longer mounted
 * here — see AnnouncementMarquee.tsx, kept for the announcement data path.
 */
export function AppShell({ region, children }: { region: string; children: React.ReactNode }) {
  return (
    <>
      <DesktopSidebar region={region} />

      <div className="flex min-h-dvh flex-col desktop:pt-[var(--header-height-desktop)]">
        <Header region={region} />
        <MobileChrome region={region} />

        {/* Bottom padding reserves room for the fixed mobile bar. */}
        <main className="flex-1 py-6 max-desktop:pb-20">
          <div className="container-page">{children}</div>
        </main>

        <Footer region={region} />
      </div>

      <MobileFooterBar region={region} />
    </>
  );
}
