import { RoutePlaceholder } from '@/components/RoutePlaceholder';
import { getT } from '@/lib/i18n/server';

export default async function Page({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const { t } = await getT('content');

  return <RoutePlaceholder title={t('pages.vip')} path={`/${region}/vip`} />;
}
