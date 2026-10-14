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
  return pageMetadata('sports', { region, path: '/sports' });
}

export default async function SportsPage() {
  const [{ t }, providers] = await Promise.all([getT('games'), getCategoryProviderCards('sports')]);

  return (
    <IntlScope namespaces={['games']}>
      <div>
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-ink text-xl font-semibold">{t('category.sports')}</h1>
            <p className="text-muted mt-1 text-xs">
              {t('page.sportsSubtitle', { count: providers.length })}
            </p>
          </div>
          <p className="text-muted text-xs">{t('page.sportsIntro')}</p>
        </header>

        <div className="mt-5">
          <ProviderCardGrid providers={providers} category="sports" />
        </div>
      </div>
    </IntlScope>
  );
}
