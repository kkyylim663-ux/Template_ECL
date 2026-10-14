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
import { tabFallbackLabel, tabLabelKey } from '@/lib/game/tabs';
import { getT, type ServerTranslate } from '@/lib/i18n/server';

type SearchParams = Record<string, string | string[] | undefined>;

/** Provider tab id → display label: translated when known, data when not. */
function labelForTab(t: ServerTranslate, id: string): string {
  const key = tabLabelKey(id);
  return key ? t(key) : tabFallbackLabel(id);
}

/**
 * The browsing lobby used by both /slots and /fast-game: studio strip, the
 * studio's own category tabs, and the card grid. Shared so the two pages cannot
 * drift apart — the difference between them is only the heading.
 */
export async function GameLobby({
  region,
  headingKey,
  introKey,
  searchParams,
}: {
  region: string;
  /** Key inside the `games` namespace. */
  headingKey: string;
  introKey: string;
  searchParams: SearchParams;
}) {
  const [{ t }, list] = await Promise.all([getT('games'), getSlotGameList()]);
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
    label: labelForTab(t, id),
    count: list.games[provider]?.[id]?.length ?? 0,
  }));

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-ink text-xl font-semibold">{t(headingKey)}</h1>
          <p className="text-muted mt-1 text-xs">
            {t('lobby.summary', {
              count: providers.length,
              category: labelForTab(t, tab),
              provider,
            })}
          </p>
        </div>
        <p className="text-muted text-xs">{t(introKey)}</p>
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
