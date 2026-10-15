import { AppShell } from '@/components/layout/AppShell';

/** The member area keeps the same chrome; its own layout adds the account rail. */
export default async function MemberLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ region: string }>;
}) {
  const { region } = await params;
  return <AppShell region={region}>{children}</AppShell>;
}
