import { DesktopSidebarGate, MobileChromeGate, MobileFooterBarGate } from './BreakpointChrome';
import { Footer } from './Footer';
import { Header } from './Header';

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
 *
 * `.app-frame` carries the `min-height` instead of Tailwind's `min-h-dvh`: under
 * the T32.6 mobile zoom a plain `100dvh` would render at 100dvh x scale, so the
 * class divides by the scale and the frame stays exactly one screen tall.
 */
export function AppShell({ region, children }: { region: string; children: React.ReactNode }) {
  return (
    <>
      <DesktopSidebarGate region={region} />

      <div className="app-frame flex flex-col desktop:pt-[var(--header-height-desktop)]">
        <Header region={region} />
        <MobileChromeGate region={region} />

        {/*
          Mobile: the header stack is fixed, so the page clears it (56px, or
          112px with the download banner — MobileChrome sets --mobile-content-top,
          the original's `has-header` / `has-app`); 80px at the bottom reserves
          room for the floating bar (`has-footer`).

          The offset sits on the inner block rather than on `main` so the first
          block's own top margin collapses into it, exactly as it does in the
          original (a flex item's margin never collapses, a plain block's does).
        */}
        <main className="flex-1 pb-6 max-desktop:pb-20">
          <div className="container-page desktop:mt-[var(--content-top-desktop)] max-desktop:mt-[var(--mobile-content-top,56px)]">
            {children}
          </div>
        </main>

        <Footer region={region} />
      </div>

      <MobileFooterBarGate region={region} />
    </>
  );
}
