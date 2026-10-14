import { callApi } from './client';
import { ENDPOINTS } from './endpoints';
import { gameCardId, gameListDataSchema, type GameListData } from './schemas';

/** A single card in the grid: everything the grid needs, nothing more. */
export type GameCard = {
  id: string;
  name: string;
  /** Art file name from the fixture; resolved to a URL by lib/game/art.ts. */
  img: string;
  provider: string;
};

export const DEFAULT_PAGE_SIZE = 24;

/** Tab order players expect; anything else follows alphabetically. */
const PREFERRED_TAB_ORDER = [
  'top',
  'all',
  'new',
  'slot',
  'slots',
  'video',
  'bbonus',
  'progressive',
  'table',
  'classic',
  'scratchcards',
];

/** Full validated slots payload. One request, then everything is derived locally. */
export async function getSlotGameList(): Promise<GameListData> {
  const { d } = await callApi(ENDPOINTS.gameList);
  return gameListDataSchema.parse(d);
}

export type ProviderSummary = {
  id: string;
  /** Tabs this provider actually has, already ordered. */
  tabs: string[];
  totalGames: number;
};

export function orderTabs(tabs: readonly string[]): string[] {
  const known = PREFERRED_TAB_ORDER.filter((tab) => tabs.includes(tab));
  const rest = tabs.filter((tab) => !PREFERRED_TAB_ORDER.includes(tab)).sort();
  return [...known, ...rest];
}

export function listProviders(list: GameListData): ProviderSummary[] {
  return list.g.map((id) => ({
    id,
    tabs: orderTabs(Object.keys(list.games[id] ?? {})),
    totalGames: Object.keys(list.details[id] ?? {}).length,
  }));
}

export function getProviderTabs(list: GameListData, provider: string): string[] {
  return orderTabs(Object.keys(list.games[provider] ?? {}));
}

/** `all` is the most useful default; otherwise the first ordered tab. */
export function defaultTab(tabs: readonly string[]): string {
  if (tabs.includes('all')) return 'all';
  return tabs[0] ?? '';
}

/** Resolve one tab's ids into cards, skipping ids with no detail record. */
export function listProviderGames(list: GameListData, provider: string, tab: string): GameCard[] {
  const ids = list.games[provider]?.[tab] ?? [];
  const details = list.details[provider] ?? {};
  const cards: GameCard[] = [];

  for (const id of ids) {
    const detail = details[id];
    if (detail) {
      cards.push({
        id: gameCardId(detail) || id,
        name: detail.name,
        img: detail.img,
        provider,
      });
    }
  }
  return cards;
}

/** Case-insensitive substring match on the game name. */
export function searchGames(cards: readonly GameCard[], query: string): GameCard[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return cards.slice();
  return cards.filter((card) => card.name.toLowerCase().includes(needle));
}

export type GamePage = {
  items: GameCard[];
  /** Games matching the current provider + tab + query. */
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

/**
 * Cumulative slice: page 2 returns the first 48 cards, not cards 25-48. That is
 * what an infinite-scroll grid needs, and it keeps the rendered page in one
 * growing list.
 */
export function visibleSlice(
  cards: readonly GameCard[],
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE,
): GamePage {
  const safePage = Math.max(1, Math.trunc(page) || 1);
  const safeSize = Math.max(1, Math.trunc(pageSize) || DEFAULT_PAGE_SIZE);
  const end = safePage * safeSize;

  return {
    items: cards.slice(0, end),
    total: cards.length,
    page: safePage,
    pageSize: safeSize,
    hasMore: end < cards.length,
  };
}

export type GameQuery = {
  provider: string;
  tab?: string;
  q?: string;
  page?: number;
  pageSize?: number;
};

export type GameQueryResult = GamePage & {
  /** Tab actually used, after falling back when the requested one is absent. */
  tab: string;
  tabs: string[];
  /** Total for the provider + tab, before the search filter. */
  providerTabTotal: number;
};

/**
 * The single entry point used by the slots page and by `/api/games`. Pure, so it
 * is cheap to unit test and safe to call from a route handler.
 */
export function queryGames(list: GameListData, query: GameQuery): GameQueryResult {
  const tabs = getProviderTabs(list, query.provider);
  const tab = query.tab && tabs.includes(query.tab) ? query.tab : defaultTab(tabs);
  const inTab = tab ? listProviderGames(list, query.provider, tab) : [];
  const filtered = searchGames(inTab, query.q ?? '');
  const page = visibleSlice(filtered, query.page ?? 1, query.pageSize ?? DEFAULT_PAGE_SIZE);

  return { ...page, providerTabTotal: inTab.length, tab, tabs };
}
