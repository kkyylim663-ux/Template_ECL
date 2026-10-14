import { RoutePlaceholder } from '@/components/RoutePlaceholder';
import { titleize } from '@/lib/text';

export default async function Page({ params }: { params: Promise<{ region: string; category: string }> }) {
  const { region, category } = await params;

  return <RoutePlaceholder title={titleize(category)} path={`/${region}/${category}`} />;
}
