import { notFound } from 'next/navigation';
import { isRegionCode } from '@/config/brand';
import { AppShell } from '@/components/layout/AppShell';

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
