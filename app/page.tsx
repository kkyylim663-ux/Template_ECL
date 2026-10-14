import { RoutePlaceholder } from '@/components/RoutePlaceholder';
import { getT } from '@/lib/i18n/server';

export default async function RootPage() {
  const { t } = await getT('content');

  return <RoutePlaceholder title={t('root.title')} path="/" note={t('root.note')} />;
}
