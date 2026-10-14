import type { Metadata, Viewport } from 'next';
import { brand } from '@/config/brand';
import './globals.css';

export const metadata: Metadata = {
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[var(--color-surface)] text-[var(--color-text)]">{children}</body>
    </html>
  );
}
