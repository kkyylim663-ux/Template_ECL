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
  return pageMetadata('esports', { region, path: '/esports' });
}

export default async function EsportsPage() {
  const [{ t }, providers] = await Promise.all([getT('games'), getCategoryProviderCards('esports')]);

  return (
    <IntlScope namespaces={['games']}>
      <div>
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-ink text-xl font-semibold">{t('category.esports')}</h1>
            <p className="text-muted mt-1 text-xs">
              {t('page.esportsSubtitle', { count: providers.length })}
            </p>
          </div>
          <p className="text-muted text-xs">{t('page.esportsIntro')}</p>
        </header>

        <div className="mt-5">
          <ProviderCardGrid providers={providers} category="esports" vpnNotice />
        </div>
      </div>
    </IntlScope>
  );
}
