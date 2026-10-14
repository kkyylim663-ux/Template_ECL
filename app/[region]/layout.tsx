import { notFound } from 'next/navigation';
import { REGION_CODES, isRegionCode } from '@/config/brand';
import { AppShell } from '@/components/layout/AppShell';

/**
 * Both markets are known up front, so the region segment is prerendered instead
 * of rendered on demand. Pages that read searchParams (the game lobbies) still
 * render dynamically, which is what filtering needs.
 */
export function generateStaticParams() {
  return REGION_CODES.map((region) => ({ region }));
}

/**
 * Region segment for every public page. Middleware already 404s unknown regions;
 * validating again here keeps the check with the type that depends on it.
 */
export default async function RegionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ region: string }>;
}) {
  const { region } = await params;

  if (!isRegionCode(region)) {
    notFound();
  }

  return <AppShell region={region}>{children}</AppShell>;
}
