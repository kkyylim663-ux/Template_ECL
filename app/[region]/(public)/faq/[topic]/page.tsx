import { RoutePlaceholder } from '@/components/RoutePlaceholder';
import { titleize } from '@/lib/text';

export default async function Page({ params }: { params: Promise<{ region: string; topic: string }> }) {
  const { region, topic } = await params;

  return <RoutePlaceholder title={`Help topic: ${titleize(topic)}`} path={`/${region}/faq/${topic}`} />;
}
