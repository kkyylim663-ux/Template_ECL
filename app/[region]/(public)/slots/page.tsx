import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  DEFAULT_PAGE_SIZE,
  defaultTab,
  getProviderTabs,
  getSlotGameList,
  listProviders,
  queryGames,
} from '@/lib/api';
import { ProviderRail } from '@/components/game/ProviderRail';
import { SlotBrowser } from '@/components/game/SlotBrowser';
import type { TabItem } from '@/components/ui/Tabs';
import { tabLabel } from '@/lib/game/tabs';

export const metadata: Metadata = {
  title: 'Slots',
  description: 'Browse every slot title by studio and category.',
};

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Slots lobby: studio strip, per-studio category tabs, and the card grid.
 *
 * The first page of cards is rendered on the server from the mock list, so the
 * studio + tab state survives a refresh through `?provider&tab&q`, and the
 * browser only ever receives 24 cards at a time.
 */
export default async function SlotsPage({
  params,
  searchParams,
}: {
  params: Promise<{ region: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { region } = await params;
  const query = await searchParams;

  const list = await getSlotGameList();
  const providers = listProviders(list);
  const fallbackProvider = providers[0];

  if (!fallbackProvider) notFound();

  const requestedProvider = typeof query.provider === 'string' ? query.provider : '';
  const provider = providers.some((entry) => entry.id === requestedProvider)
    ? requestedProvider
    : fallbackProvider.id;

  const tabs = getProviderTabs(list, provider);
  const requestedTab = typeof query.tab === 'string' ? query.tab : '';
  const tab = tabs.includes(requestedTab) ? requestedTab : defaultTab(tabs);
  const search = typeof query.q === 'string' ? query.q : '';

  const page = queryGames(list, { provider, tab, q: search, page: 1, pageSize: DEFAULT_PAGE_SIZE });

  const tabItems: TabItem[] = tabs.map((id) => ({
    id,
    label: tabLabel(id),
    count: list.games[provider]?.[id]?.length ?? 0,
  }));

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-ink text-xl font-semibold">Slots</h1>
          <p className="text-muted mt-1 text-xs">
            {providers.length} studios · {tabLabel(tab)} · {provider}
          </p>
        </div>
        <p className="text-muted text-xs">
          Browse only — launching a game is disabled in this build.
        </p>
      </header>

      <ProviderRail region={region} providers={providers} active={provider} tab={tab} />

      <SlotBrowser
        key={provider}
        provider={provider}
        tabs={tabItems}
        initialTab={tab}
        initialQuery={search}
        initialPage={page}
        providerTabTotal={page.providerTabTotal}
      />
    </div>
  );
}
