import type { Metadata } from 'next';
import Link from 'next/link';
import { getDisplayPayload } from '@/lib/api';
import { PredictionBoard } from '@/components/game/PredictionBoard';
import { IntlScope } from '@/lib/i18n/scope';
import { getT } from '@/lib/i18n/server';
import { regionPath } from '@/config/nav';
import { regionConfig, type RegionCode } from '@/config/brand';
import { pageMetadata } from '@/lib/seo';

/** The five tabs the reference shows above `.pd-card-list`. */
const TABS = [
  { id: 'all', key: 'prediction.tab.all', search: '', statuses: ['active', 'upcoming', 'ended'] },
  {
    id: 'activeUpcoming',
    key: 'prediction.tab.activeUpcoming',
    search: '?status=active-upcoming',
    statuses: ['active', 'upcoming'],
  },
  { id: 'active', key: 'prediction.tab.active', search: '?status=active', statuses: ['active'] },
  {
    id: 'upcoming',
    key: 'prediction.tab.upcoming',
    search: '?status=upcoming',
    statuses: ['upcoming'],
  },
  { id: 'ended', key: 'prediction.tab.ended', search: '?status=ended', statuses: ['ended'] },
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region } = await params;
  return pageMetadata('prediction', { region, path: '/prediction' });
}

/**
 * Prediction, in the reference build's order (`crawl/pages/my_prediction.html`):
 * banner, five `.nav-pill` tabs in a `.banner-top.section-bottom` row, then the
 * `.pd-card-list` three-column grid. The reference hydrates the cards and its own
 * slip chunk was never captured, so the page server-renders the fixtures — the
 * tab state stays in `?status=`, which keeps the tab switch a plain link — and
 * hands them to `PredictionBoard`, which owns the pick dialog, the slip below the
 * list and the member's own tickets.
 */
export default async function PredictionPage({
  params,
  searchParams,
}: {
  params: Promise<{ region: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { region } = await params;
  const query = await searchParams;
  const [{ t }, { prediction }] = await Promise.all([getT('games'), getDisplayPayload()]);
  const { symbol } = regionConfig(region as RegionCode);

  const requested = typeof query.status === 'string' ? query.status : '';
  const tab = TABS.find((option) => option.id === requested)?.id ?? TABS[0].id;
  const statuses: readonly string[] = TABS.find((option) => option.id === tab)?.statuses ?? [];
  const fixtures = prediction.filter((fixture) => statuses.includes(fixture.status));
  const base = regionPath(region, '/prediction');

  return (
    <IntlScope namespaces={['games']}>
      <div>
        <section
          data-part="banner-section"
          aria-hidden
          className="page-hero game-placeholder h-40 max-desktop:h-28"
        />

        <h1 className="sr-only">{t('category.prediction')}</h1>

        <div className="banner-top section-bottom">
          <div className="nav-pill__wrapper" role="group" aria-label={t('prediction.tabs')}>
            {TABS.map((option) => (
              <Link
                key={option.id}
                href={`${base}${option.search}`}
                aria-current={option.id === tab ? 'true' : undefined}
                className="nav-pill nav-pill__fix-width"
              >
                <span>{t(option.key)}</span>
              </Link>
            ))}
          </div>
        </div>

        <PredictionBoard fixtures={fixtures} region={region} symbol={symbol} />
      </div>
    </IntlScope>
  );
}
