import type { Metadata } from 'next';
import { getCategoryProviderCards } from '@/lib/api';
import { ProviderCardGrid } from '@/components/game/ProviderCardGrid';
import { IntlScope } from '@/lib/i18n/scope';
import { getT } from '@/lib/i18n/server';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region } = await params;
  return pageMetadata('livecasino', { region, path: '/livecasino' });
}

export default async function LiveCasinoPage() {
  const [{ t }, providers] = await Promise.all([
    getT('games'),
    getCategoryProviderCards('livecasino'),
  ]);

  return (
    <IntlScope namespaces={['games']}>
      <div>
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-ink text-xl font-semibold">{t('category.livecasino')}</h1>
            <p className="text-muted mt-1 text-xs">
              {t('page.livecasinoSubtitle', { count: providers.length })}
            </p>
          </div>
          <p className="text-muted text-xs">{t('page.livecasinoIntro')}</p>
        </header>

        <div className="mt-5">
          <ProviderCardGrid providers={providers} category="livecasino" vpnNotice />
        </div>
      </div>
    </IntlScope>
  );
}
