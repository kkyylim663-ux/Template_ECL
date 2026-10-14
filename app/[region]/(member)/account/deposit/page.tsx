import { RoutePlaceholder } from '@/components/RoutePlaceholder';

export default async function Page({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;

  return <RoutePlaceholder title={"Deposit"} path={`/${region}/account/deposit`} />;
}
