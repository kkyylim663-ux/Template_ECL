import { AppShell } from '@/components/layout/AppShell';

/** Public pages carry the full chrome: header, side navigation and footer. */
export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ region: string }>;
}) {
  const { region } = await params;
  return <AppShell region={region}>{children}</AppShell>;
}
