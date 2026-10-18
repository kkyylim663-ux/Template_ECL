import { describe, expect, it } from 'vitest';
import { bannerListSchema, announcementListSchema, promotionListSchema } from '@/lib/api/schemas';
import {
  DEFAULT_PAGE_SIZE,
  getProviderTabs,
  getSlotGameList,
  listProviderGames,
  listProviders,
  queryGames,
  searchGames,
  visibleSlice,
} from '@/lib/api/slots';

describe('slots fixture (mocks/slots.gamelist.json)', () => {
  it('parses: 28 providers and 6121 games', async () => {
    const list = await getSlotGameList();

    expect(list.g).toHaveLength(28);

    const detailCount = Object.values(list.details).reduce(
      (total, provider) => total + Object.keys(provider).length,
      0,
    );
    expect(detailCount).toBe(6121);
  });

  it('exposes each provider its own set of tabs', async () => {
    const list = await getSlotGameList();

    expect(getProviderTabs(list, 'pragmatic')).toEqual([
      'top',
      'all',
      'slot',
      'bbonus',
      'classic',
      'scratchcards',
    ]);
    // A different provider, different tabs — the fixture is not uniform.
    expect(getProviderTabs(list, 'pt')).toContain('new');
    expect(getProviderTabs(list, 'pt')).not.toContain('bbonus');
  });

  it('keeps only the pragmatic / all games whose cover is on disk', async () => {
    const list = await getSlotGameList();
    const result = queryGames(list, { provider: 'pragmatic', tab: 'all' });

    // The fixture lists 698; the grid drops the ones without pulled artwork.
    expect(result.providerTabTotal).toBe(result.total);
    expect(result.total).toBeGreaterThan(20);
    expect(result.total).toBeLessThan(698);
  });

  it('renders 24 cards first, then adds 24 more per page', async () => {
    const list = await getSlotGameList();
    const cards = listProviderGames(list, 'pragmatic', 'all');

    // Every grid card carries pulled artwork (filtered in listProviderGames).
    expect(cards.every((card) => card.cover)).toBe(true);
    expect(cards.length).toBeGreaterThan(DEFAULT_PAGE_SIZE);

    const page1 = visibleSlice(cards, 1);
    expect(page1.items).toHaveLength(DEFAULT_PAGE_SIZE);
    expect(page1.hasMore).toBe(true);

    const page2 = visibleSlice(cards, 2);
    expect(page2.items).toHaveLength(Math.min(DEFAULT_PAGE_SIZE * 2, cards.length));

    const lastPage = visibleSlice(cards, 30);
    expect(lastPage.items).toHaveLength(cards.length);
    expect(lastPage.hasMore).toBe(false);
  });

  it('finds "olympus" regardless of case', async () => {
    const list = await getSlotGameList();
    const inTab = listProviderGames(list, 'pragmatic', 'all');

    const lower = searchGames(inTab, 'olympus');
    const upper = searchGames(inTab, 'OLYMPUS');

    expect(lower.length).toBeGreaterThan(0);
    expect(lower.map((card) => card.id)).toEqual(upper.map((card) => card.id));
    expect(lower.every((card) => card.name.toLowerCase().includes('olympus'))).toBe(true);
  });

  it('falls back to a sensible tab when the requested one is absent', async () => {
    const list = await getSlotGameList();
    const result = queryGames(list, { provider: 'pragmatic', tab: 'not-a-tab' });

    expect(result.tab).toBe('all');
  });

  it('lists every provider with at least one tab', async () => {
    const list = await getSlotGameList();
    const providers = listProviders(list);

    expect(providers).toHaveLength(28);
    expect(providers.every((provider) => provider.tabs.length > 0)).toBe(true);
    expect(providers.every((provider) => provider.totalGames > 0)).toBe(true);
  });
});

describe('content mocks', () => {
  it('parse against their schemas', async () => {
    // Mocks are captured response envelopes, so the payload is under `d`.
    const banners = bannerListSchema.parse((await import('@/mocks/banners.json')).default.d);
    const announcements = announcementListSchema.parse(
      (await import('@/mocks/announcements.json')).default.d,
    );
    const promotions = promotionListSchema.parse(
      (await import('@/mocks/promotions.json')).default.d,
    );

    expect(banners.length).toBeGreaterThan(0);
    expect(announcements.length).toBeGreaterThan(0);
    expect(promotions.length).toBeGreaterThan(0);
  });

  it('orders banners by their order field', async () => {
    const { getBanners } = await import('@/lib/api/content');
    const banners = await getBanners();
    const orders = banners.map((banner) => banner.order);

    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });
});
