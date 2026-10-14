import type { Metadata, Viewport } from 'next';
import { Rubik } from 'next/font/google';
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

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${brand.name} — ${brand.tagline}`,
    template: `%s · ${brand.name}`,
  },
  description: brand.legal.demoNotice,
};

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
    <html lang={locale} className={`${rubik.variable} motion-safe:scroll-smooth`}>
      <body className="bg-surface text-ink font-sans antialiased">
        <IconSprite only={SHELL_ICON_NAMES} />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
