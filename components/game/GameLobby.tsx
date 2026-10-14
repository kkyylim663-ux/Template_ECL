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

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * The browsing lobby used by both /slots and /fast-game: studio strip, the
 * studio's own category tabs, and the card grid. Shared so the two pages cannot
 * drift apart — the difference between them is only the heading.
 */
export async function GameLobby({
  region,
  heading,
  intro,
  searchParams,
}: {
  region: string;
  heading: string;
  intro: string;
  searchParams: SearchParams;
}) {
  const list = await getSlotGameList();
  const providers = listProviders(list);
  const fallbackProvider = providers[0];

  if (!fallbackProvider) notFound();

  const requestedProvider = typeof searchParams.provider === 'string' ? searchParams.provider : '';
  const provider = providers.some((entry) => entry.id === requestedProvider)
    ? requestedProvider
    : fallbackProvider.id;

  const tabs = getProviderTabs(list, provider);
  const requestedTab = typeof searchParams.tab === 'string' ? searchParams.tab : '';
  const tab = tabs.includes(requestedTab) ? requestedTab : defaultTab(tabs);
  const search = typeof searchParams.q === 'string' ? searchParams.q : '';

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
          <h1 className="text-ink text-xl font-semibold">{heading}</h1>
          <p className="text-muted mt-1 text-xs">
            {providers.length} studios · {tabLabel(tab)} · {provider}
          </p>
        </div>
        <p className="text-muted text-xs">{intro}</p>
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
