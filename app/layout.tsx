import type { Metadata, Viewport } from 'next';
import { Noto_Sans, Roboto, Rubik } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { brand } from '@/config/brand';
import { siteUrl } from '@/lib/seo';
import { getShell } from '@/lib/i18n/server';
import { IconSprite } from '@/components/ui/IconSprite';
import { SHELL_ICON_NAMES } from '@/components/ui/icon-paths';
import { Providers } from '@/components/ui/Providers';
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
 */
const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-roboto',
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
 * Pins the rendered text size against the phone's system font-size setting
 * (Android multiplies every font-size by that factor). A hidden 100px probe
 * measures the factor f, and `<html>` gets `--fs-fix = 1/f`, which every
 * font-size token in globals.css multiplies by — so text always renders at its
 * designed size. Runs synchronously before first paint (the App Router has no
 * hand-written <head>, so the script is the first element of <body>; the
 * parser executes it before any content or paint). Clamped to 0.8–2, skipped
 * when f ≈ 1, re-measured on resize / visibilitychange (T32.5).
 *
 * The probe is marked `data-fs-probe` so tests can fake the measured factor
 * (Playwright cannot set the device font scale) by intercepting clientHeight.
 */
const FS_FIX_SCRIPT = `(function(){var d=document,r=d.documentElement;function m(){var e=d.createElement("div");e.setAttribute("data-fs-probe","");e.setAttribute("aria-hidden","true");e.style.cssText="position:absolute;top:0;left:-9999px;visibility:hidden;pointer-events:none;font-size:100px;line-height:1;height:auto;min-height:0;max-height:none;padding:0;margin:0;border:0";(d.body||r).appendChild(e);var f=(e.clientHeight||100)/100;e.remove();return f}function a(){var f=m();f=Math.max(.8,Math.min(2,f));if(Math.abs(f-1)<.01){r.style.removeProperty("--fs-fix")}else{r.style.setProperty("--fs-fix",String(1/f))}}a();addEventListener("resize",a);d.addEventListener("visibilitychange",function(){if(!d.hidden)a()})})();`;

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

  return (
    <html
      lang={locale}
      className={`${rubik.variable} ${noto.variable} ${roboto.variable} motion-safe:scroll-smooth`}
    >
      <body className="bg-surface text-ink font-sans antialiased">
        <script dangerouslySetInnerHTML={{ __html: FS_FIX_SCRIPT }} />
        <IconSprite only={SHELL_ICON_NAMES} />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
