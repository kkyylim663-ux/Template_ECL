import { RoutePlaceholder } from '@/components/RoutePlaceholder';

export default async function Page({ params }: { params: Promise<{ region: string; id: string }> }) {
  const { region, id } = await params;

  return <RoutePlaceholder title={`News #${id}`} path={`/${region}/update/${id}`} />;
}
