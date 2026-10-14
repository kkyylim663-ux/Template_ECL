import { RoutePlaceholder } from '@/components/RoutePlaceholder';

export default async function Page({ params }: { params: Promise<{ region: string; id: string }> }) {
  const { region, id } = await params;

  return <RoutePlaceholder title={`Promotion #${id}`} path={`/${region}/promotion/${id}`} />;
}
