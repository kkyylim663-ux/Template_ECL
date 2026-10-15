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
 * The browsing lobby shared by /slots and /fast-game, in the original's block
 * order: `banner-section`, the `h1.form-title.large` with its 28px page icon,
 * the studio strip (`.gamelist-wrapper`), the option bar with the category
 * pills and the search pill, then the 6-column card grid. Shared so the two
 * pages cannot drift apart — the difference between them is the icon tone and
 * the heading text only.
 */
export async function GameLobby({
  region,
  headingKey,
  tone,
  searchParams,
}: {
  region: string;
  /** Key inside the `games` namespace. */
  headingKey: string;
  /** Placeholder hue for the hero band and the page icon. */
  tone: number;
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
  }));

  return (
    <div>
      <section
        data-part="banner-section"
        aria-hidden
        className="page-hero game-placeholder h-40 max-desktop:h-28"
        style={{ '--tone': String(tone) } as React.CSSProperties}
      />

      <h1 className="page-title has-space">
        <span
          aria-hidden
          className="page-title__icon game-placeholder"
          style={{ '--tone': String(tone) } as React.CSSProperties}
        />
        {t(headingKey)}
      </h1>

      <ProviderRail region={region} providers={providers} active={provider} tab={tab} />

      <SlotBrowser
        key={provider}
        provider={provider}
        tabs={tabItems}
        initialTab={tab}
        initialQuery={search}
        initialPage={page}
      />
    </div>
  );
}
