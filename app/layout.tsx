import type { Metadata, Viewport } from 'next';
import { Noto_Sans, Roboto, Rubik, Rye } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { brand } from '@/config/brand';
import { fontPreloadHrefs } from '@/lib/font-preloads';
import { siteUrl } from '@/lib/seo';
import { getShell } from '@/lib/i18n/server';
import { IconSprite } from '@/components/ui/IconSprite';
import { SHELL_ICON_NAMES } from '@/components/ui/icon-paths';
import { Providers } from '@/components/ui/Providers';
import { DemoDataBadge } from '@/components/layout/DemoDataBadge';
import './globals.css';

/**
 * Rubik 400/500, per docs/UI_REFERENCE.md, with Roboto / Noto Sans as the
 * declared fallbacks in `--font-sans`. Next self-hosts the file it downloads, so
 * the browser never talks to Google; the first build needs network access once.
 */
const rubik = Rubik({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-rubik',
  display: 'swap',
});

/**
 * Table heads only (`table thead` in the reference pins Noto Sans over the
 * body's Rubik; 400 covers the fallback path, 600 the actual head weight).
 */
const noto = Noto_Sans({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-noto',
  display: 'swap',
});

/**
 * The 4D result cards only (`crawl/css` pins Roboto on `.lottery-result__*`).
 * Loaded alongside Rubik so the six-digit grids keep the reference's digits.
 *
 * `preload: false`: those cards sit below the fold, and a preload per family
 * would spend ~100 KB of the mobile first-load budget (Rubik + Noto + Roboto
 * latin) competing with the render-blocking CSS. Next's own manifest would
 * preload every family; T72 preloads only the two the first viewport uses —
 * see `lib/font-preloads.ts` for why the tags are hand-built here.
 */
const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-roboto',
  display: 'swap',
  preload: false,
});

/**
 * Dusk Saloon display face (STYLE-GUIDE §4): the brand wordmark and the big
 * titles — one weight, latin only. On home it lands in the first viewport (the
 * hero headline), so it keeps next/font's own preload like Rubik; on the other
 * routes the hand-built preload list in `lib/font-preloads.ts` picks it up from
 * the built stylesheet.
 */
const rye = Rye({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-rye',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${brand.name} — ${brand.tagline}`,
    template: `%s · ${brand.name}`,
  },
  description: brand.legal.demoNotice,
};

/**
 * The two viewport variables every page reads, set before first paint by one
 * synchronous script (the App Router has no hand-written <head>, so the script is
 * the first element of <body>; the parser runs it before any content or paint):
 *
 * - `--fs-fix` (T32.5): pins rendered text against the phone's system font-size
 *   setting. Android multiplies every font-size by that factor, so a hidden 100px
 *   probe measures f = height/100 and `<html>` gets `1/f`, which every font-size
 *   token in globals.css multiplies by. Clamped to 0.8–2, skipped when f ≈ 1.
 * - `--m-scale` (T32.6): 1 at the 375px design width, rising and falling with the
 *   screen so a 360 and a 414 phone see the same page at different sizes. The
 *   factor is `screenWidth / 375`, clamped to 0.85333–1.14667 (i.e. the 320–430
 *   band); wider viewports keep 1.14667, so the page stops growing there and the
 *   shell caps itself to a centred 430px column. `globals.css` applies it as
 *   `zoom` on `.m-root` below 769px only, so desktop never sees it.
 *
 * Both are re-measured on resize / visibilitychange.
 *
 * The same script also sets `--mobile-content-top` (56px, or 112px while the app
 * download strip is up) from the dismiss flag, so the phone's content offset is
 * already final on the first paint. `MobileChrome` used to write it after
 * hydration, which moved the whole page down 56px the moment React mounted — the
 * 0.069 CLS Lighthouse charged the home page in T72.
 *
 * The probe is marked `data-fs-probe` so tests can fake the measured factor
 * (Playwright cannot set the device font scale) by intercepting clientHeight.
 */
const VIEWPORT_SCRIPT = `(function(){var d=document,r=d.documentElement;function m(){var e=d.createElement("div");e.setAttribute("data-fs-probe","");e.setAttribute("aria-hidden","true");e.style.cssText="position:absolute;top:0;left:-9999px;visibility:hidden;pointer-events:none;font-size:100px;line-height:1;height:auto;min-height:0;max-height:none;padding:0;margin:0;border:0";(d.body||r).appendChild(e);var f=(e.clientHeight||100)/100;e.remove();return f}function a(){var f=m();f=Math.max(.8,Math.min(2,f));if(Math.abs(f-1)<.01){r.style.removeProperty("--fs-fix")}else{r.style.setProperty("--fs-fix",String(1/f))}var w=r.clientWidth||375;r.style.setProperty("--m-scale",String(Math.min(Math.max(w/375,320/375),430/375)))}a();addEventListener("resize",a);addEventListener("orientationchange",a);d.addEventListener("visibilitychange",function(){if(!d.hidden)a()});try{r.style.setProperty("--mobile-content-top",localStorage.getItem("brand.appBannerDismissed")==="1"?"56px":"112px")}catch(e){r.style.setProperty("--mobile-content-top","112px")}})();`;

export const viewport: Viewport = {
  themeColor: brand.themeColor,
  width: 'device-width',
  initialScale: 1,
};

/**
 * The language lives in a cookie (see lib/i18n/config.ts), so the root layout
 * reads it per request: `<html lang>` and the shell messages follow the visitor's
 * choice. Pages add their own namespaces through `IntlScope`.
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, messages } = await getShell();
  const fontPreloads = fontPreloadHrefs();

  return (
    <html
      lang={locale}
      className={`${rubik.variable} ${noto.variable} ${roboto.variable} ${rye.variable} motion-safe:scroll-smooth`}
      // VIEWPORT_SCRIPT sets --m-scale / --fs-fix on <html> before React hydrates.
      suppressHydrationWarning
    >
      <body className="bg-surface text-ink font-sans antialiased">
        {/*
          Font preloads (T72): React 19 hoists these into <head>, ahead of the
          stylesheets, and de-dupes them. `crossOrigin` is required — font
          fetches are always CORS-mode, and a preload without it downloads twice.
        */}
        {fontPreloads.map((href) => (
          <link
            key={href}
            rel="preload"
            href={href}
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
        ))}
        <script dangerouslySetInnerHTML={{ __html: VIEWPORT_SCRIPT }} />
        {/*
          `.m-root` is the T32.6 zoom root: the whole tree (shell, pages, and the
          Modal / Toast hosts, which render as siblings of the pages) scales with
          the screen below 769px. A 375px-wide box plus `zoom: --m-scale` renders
          exactly one screen wide, and every px inside — boxes, gaps, text —
          scales with it. Above 430px viewports the box stays 430 and centres.
        */}
        <div className="m-root">
          <IconSprite only={SHELL_ICON_NAMES} />
          <NextIntlClientProvider locale={locale} messages={messages}>
            <Providers>{children}</Providers>
          </NextIntlClientProvider>
          <DemoDataBadge />
        </div>
      </body>
    </html>
  );
}
