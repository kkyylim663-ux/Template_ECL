import { MOCK_MODE } from '@/lib/api/client';
import { getT } from '@/lib/i18n/server';

/**
 * T49.5: the "demo data" marker. It reads the same switch the mock transport
 * does, so pointing the build at a real backend (`NEXT_PUBLIC_USE_MOCK=0`)
 * removes the marker together with the mocks.
 */
export async function DemoDataBadge() {
  if (!MOCK_MODE) return null;
  const { t } = await getT('common');
  return (
    <span className="demo-data-badge" data-demo-badge="true">
      {t('demoData')}
    </span>
  );
}
