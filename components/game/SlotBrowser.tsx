'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameCard as GameCardData, GamePage } from '@/lib/api/slots';
import { Icon } from '@/components/ui/Icon';
import { GameCardSkeleton } from '@/components/ui/Skeleton';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { GameCard } from './GameCard';

type PagePayload = GamePage;

/**
 * Slots browser: tabs, search, grid and infinite scroll.
 *
 * The first 24 cards arrive server-rendered as `initialPage`; everything after
 * that comes from `/api/games`, one page at a time, so the browser never receives
 * the full 6121-game list. The 200ms debounce is also the single place that
 * loads data and writes the URL, which keeps `?provider&tab&q` in step with what
 * is on screen.
 */
export function SlotBrowser({
  provider,
  tabs,
  initialTab,
  initialQuery,
  initialPage,
  providerTabTotal,
}: {
  provider: string;
  tabs: TabItem[];
  initialTab: string;
  initialQuery: string;
  initialPage: PagePayload;
  providerTabTotal: number;
}) {
  const t = useTranslations('games');
  const tCommon = useTranslations('common');
  const pathname = usePathname();

  const [tab, setTab] = useState(initialTab);
  const [query, setQuery] = useState(initialQuery);
  const [items, setItems] = useState<GameCardData[]>(initialPage.items);
  const [total, setTotal] = useState(initialPage.total);
  const [page, setPage] = useState(initialPage.page);
  const [hasMore, setHasMore] = useState(initialPage.hasMore);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  // Skips the debounce on the very first render: those items are already there.
  const firstRun = useRef(true);
  const sentinel = useRef<HTMLDivElement>(null);

  // The scroll observer is registered once and reads everything through refs, so
  // a load never tears the observer down and loses track of the sentinel.
  const live = useRef({ page, tab, query, hasMore, busy, provider });
  live.current = { page, tab, query, hasMore, busy, provider };
  const lastLoadAt = useRef(0);

  // Live mirror of the local state, read by the adopt effect below without
  // making tab/query dependencies of it (that would revert every local edit).
  const local = useRef({ tab, query });
  local.current = { tab, query };

  const load = useCallback(
    async (targetPage: number, nextTab: string, nextQuery: string) => {
      setBusy(true);
      setFailed(null);
      try {
        const params = new URLSearchParams({
          provider,
          tab: nextTab,
          page: String(targetPage),
        });
        if (nextQuery) params.set('q', nextQuery);

        const response = await fetch(`/api/games?${params.toString()}`);
        const payload = await response.json();
        if (payload?.status !== '0') throw new Error(payload?.msg ?? `HTTP ${response.status}`);

        const data = payload.d as PagePayload;
        setItems(data.items);
        setTotal(data.total);
        setPage(data.page);
        setHasMore(data.hasMore);
      } catch (error) {
        setFailed(error instanceof Error ? error.message : t('browser.requestFailed'));
      } finally {
        setBusy(false);
      }
    },
    [provider, t],
  );

  // The observer callback must always call the current `load`, without being a
  // dependency of the effect that registers it.
  const loadRef = useRef(load);
  loadRef.current = load;

  // Tab and search changes: debounce, reload page 1, keep the address bar in step.
  //
  // The URL is written with `history.replaceState`, not `router.replace`: the grid
  // is fetched here anyway, and asking the router would re-render the whole tree
  // from the server on every settled keystroke — a reply that could land while the
  // reader is already typing the next word.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      void load(1, tab, query);
      const params = new URLSearchParams({ provider, tab });
      if (query) params.set('q', query);
      window.history.replaceState(null, '', `${pathname}?${params.toString()}`);
    }, 200);

    return () => window.clearTimeout(timer);
  }, [tab, query, provider, pathname, load]);

  // Back and forward: the address bar is the source of truth, so re-read it and
  // load that view. No server round-trip is needed for a filter change.
  useEffect(() => {
    function onPopState() {
      const params = new URLSearchParams(window.location.search);
      const nextTab = params.get('tab') ?? local.current.tab;
      const nextQuery = params.get('q') ?? '';
      if (nextTab === local.current.tab && nextQuery === local.current.query) return;

      setTab(nextTab);
      setQuery(nextQuery);
      // The URL asked for it: no need to write it back.
      firstRun.current = true;
      void loadRef.current(1, nextTab, nextQuery);
    }

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Adopt server-rendered state when the props change underneath us (a provider
  // link, the back button after a document navigation). Local edits match the
  // props, so they skip this; a payload that does not match the address bar is a
  // stale one and is ignored, which is what keeps fast typing from being undone.
  useEffect(() => {
    const current = new URLSearchParams(window.location.search);
    if (initialTab !== (current.get('tab') ?? '') || initialQuery !== (current.get('q') ?? '')) {
      return;
    }
    if (initialTab === local.current.tab && initialQuery === local.current.query) return;

    setTab(initialTab);
    setQuery(initialQuery);
    setItems(initialPage.items);
    setTotal(initialPage.total);
    setPage(initialPage.page);
    setHasMore(initialPage.hasMore);
    local.current = { tab: initialTab, query: initialQuery };
    // The server already fetched this view; do not ask again.
    firstRun.current = true;
  }, [initialTab, initialQuery, initialPage]);

  // Infinite scroll: one page at a time. Registered once; each trigger needs the
  // previous load to have settled and 400ms to have passed, which keeps a single
  // scroll gesture from pulling in every remaining page.
  useEffect(() => {
    const element = sentinel.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;

        const state = live.current;
        if (!state.hasMore || state.busy) return;
        if (Date.now() - lastLoadAt.current < 400) return;

        lastLoadAt.current = Date.now();
        void loadRef.current(state.page + 1, state.tab, state.query);
      },
      { rootMargin: '200px' },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <section>
      <div className="mt-5 flex flex-col gap-3 desktop:flex-row desktop:items-center desktop:justify-between">
        <Tabs tabs={tabs} value={tab} onChange={setTab} label={t('browser.categories', { provider })} />

        <div className="relative desktop:w-72">
          <span className="text-muted pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
            <Icon name="search" size={16} />
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('browser.searchPlaceholder')}
            aria-label={t('browser.searchLabel')}
            className="border-line bg-panel text-ink placeholder:text-muted focus:border-accent w-full rounded-[var(--radius-tag)] border py-2 pr-3 pl-9 text-sm outline-none"
          />
        </div>
      </div>

      <p className="text-muted mt-3 text-xs" aria-live="polite">
        {query ? (
          <>{t('browser.resultsFor', { count: total, query })}</>
        ) : (
          <>
            {t('browser.titlesIn', { count: total, provider, tab })}
            {providerTabTotal !== total ? (
              <> · {t('browser.beforeFiltering', { count: providerTabTotal })}</>
            ) : null}
          </>
        )}
        {busy ? ` · ${t('browser.updating')}` : null}
      </p>

      {failed ? (
        <div className="border-line bg-panel mt-4 rounded-[var(--radius-panel)] border p-6 text-center">
          <p className="text-muted text-sm">{t('browser.loadFailed', { message: failed })}</p>
          <button
            type="button"
            onClick={() => void load(page, tab, query)}
            className="border-line text-ink hover:border-accent mt-3 rounded-[8px] border px-4 py-2 text-xs"
          >
            {tCommon('action.retry')}
          </button>
        </div>
      ) : null}

      {items.length === 0 && !busy ? (
        <div className="border-line bg-panel mt-4 rounded-[var(--radius-panel)] border p-8 text-center">
          <p className="text-ink text-sm font-medium">{t('browser.empty', { query })}</p>
          <p className="text-muted mt-1 text-xs">{t('browser.emptyHint')}</p>
          <button
            type="button"
            onClick={() => setQuery('')}
            className="border-line text-ink hover:border-accent mt-4 rounded-[8px] border px-4 py-2 text-xs"
          >
            {t('browser.clearSearch')}
          </button>
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-3 desktop:grid-cols-6 desktop:gap-5">
        {items.map((game) => (
          <GameCard key={`${game.provider}-${game.id}`} game={game} />
        ))}
        {busy
          ? Array.from({ length: 6 }, (_, index) => <GameCardSkeleton key={`skeleton-${index}`} />)
          : null}
      </div>

      <div ref={sentinel} aria-hidden className="h-10" />

      <p className="text-muted text-center text-xs">
        {hasMore
          ? t('browser.showing', { shown: items.length, total })
          : t('browser.shown', { count: total })}
      </p>
    </section>
  );
}
