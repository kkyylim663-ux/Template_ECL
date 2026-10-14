import { describe, expect, it } from 'vitest';
import {
  getFaq,
  getFaqTopics,
  getPageContent,
  getPromotion,
  getPromotionNeighbours,
  getPromotions,
  getSponsorBlocks,
  getUpdate,
  getUpdates,
  getVipLevels,
  getVipPrivileges,
  getVipRules,
} from '@/lib/api';
import type { PageSlug } from '@/lib/api';

/**
 * The content layer over the T17 mocks: every getter answers, every unknown id
 * answers `null` (that is what turns into a 404 in the pages), and the shapes
 * survive their zod parse.
 */
describe('content getters (mocks/promotions.json, updates, faq, vip, sponsor, pages)', () => {
  it('getPromotions returns eight offers with categories and rules', async () => {
    const promotions = await getPromotions();

    expect(promotions).toHaveLength(8);
    for (const promotion of promotions) {
      expect(promotion.rules.length).toBeGreaterThan(20);
      expect(promotion.startsAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
      expect(promotion.endsAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
    }
    expect(new Set(promotions.map((promotion) => promotion.category)).size).toBeGreaterThan(3);
  });

  it('getPromotion finds by id and by slug, and answers null for the rest', async () => {
    const byId = await getPromotion('pr-welcome-188');
    const bySlug = await getPromotion('welcome-188');

    expect(byId?.title).toBe('Welcome bonus 188%');
    expect(bySlug?.id).toBe('pr-welcome-188');
    expect(await getPromotion('pr-nope')).toBeNull();
  });

  it('getPromotionNeighbours walks the list in order', async () => {
    const middle = await getPromotionNeighbours('slot-rebate-08');
    expect(middle.previous?.id).toBe('pr-daily-reload-18');
    expect(middle.next?.id).toBe('pr-live-weekend');

    const first = await getPromotionNeighbours('pr-welcome-188');
    expect(first.previous).toBeNull();
    expect(first.next?.id).toBe('pr-daily-reload-18');

    const missing = await getPromotionNeighbours('pr-nope');
    expect(missing).toEqual({ previous: null, next: null });
  });

  it('getUpdates returns six items, newest first', async () => {
    const updates = await getUpdates();

    expect(updates).toHaveLength(6);
    const dates = updates.map((update) => update.publishedAt);
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(updates.every((update) => update.body.length > 20)).toBe(true);
  });

  it('getUpdate finds one and answers null otherwise', async () => {
    expect((await getUpdate('up-059'))?.title).toContain('Withdrawal');
    expect(await getUpdate('up-999')).toBeNull();
  });

  it('getFaqTopics lists eight topics with five to eight questions each', async () => {
    const topics = await getFaqTopics();

    expect(topics.map((topic) => topic.id)).toEqual([
      'gettingstart',
      'finance',
      'statement',
      'games',
      'events',
      'promotions',
      'contactus',
      'downloadapp',
    ]);
    for (const topic of topics) {
      expect(topic.count).toBeGreaterThanOrEqual(5);
      expect(topic.count).toBeLessThanOrEqual(8);
    }
  });

  it('getFaq returns the topic with its answers, or null', async () => {
    const finance = await getFaq('finance');

    expect(finance?.items).toHaveLength(7);
    expect(finance?.items[0].q.length).toBeGreaterThan(5);
    expect(await getFaq('nonexistent')).toBeNull();
  });

  it('getVipLevels returns five tiers with rising thresholds', async () => {
    const levels = await getVipLevels();

    expect(levels.map((level) => level.name)).toEqual([
      'Bronze',
      'Silver',
      'Gold',
      'Platinum',
      'Diamond',
    ]);
    const thresholds = levels.map((level) => level.thresholdMinor);
    expect([...thresholds].sort((a, b) => a - b)).toEqual(thresholds);
    expect(levels.every((level) => level.benefits.length >= 3)).toBe(true);
    expect((await getVipRules()).length).toBeGreaterThan(50);
  });

  it('getVipPrivileges covers every tier in every row', async () => {
    const groups = await getVipPrivileges();
    const levels = await getVipLevels();
    const levelIds = levels.map((level) => level.id);

    expect(groups.length).toBeGreaterThanOrEqual(4);
    const rows = groups.flatMap((group) => group.rows);
    expect(rows.length).toBeGreaterThanOrEqual(6);
    for (const row of rows) {
      expect(Object.keys(row.values).sort()).toEqual([...levelIds].sort());
    }
    // The withdrawal row carries minor units for the region formatter.
    const moneyRow = rows.find((row) => row.money);
    expect(moneyRow).toBeDefined();
    expect(Number(moneyRow?.values['vip-1'])).toBeGreaterThan(0);
  });

  it('getSponsorBlocks carries the carousel, the video grid and the partners', async () => {
    const sponsor = await getSponsorBlocks();

    expect(sponsor.logoEvolution).toHaveLength(5);
    expect(sponsor.videos.length).toBeGreaterThanOrEqual(6);
    expect(sponsor.partners.length).toBeGreaterThanOrEqual(6);
  });

  it('getPageContent serves the four long-form pages and nothing else', async () => {
    for (const slug of ['about', 'contact', 'tnc', 'betting-rules'] as const) {
      const page = await getPageContent(slug);
      expect(page?.slug).toBe(slug);
      expect(page?.sections.length).toBeGreaterThanOrEqual(3);
      for (const section of page?.sections ?? []) {
        expect(section.id).toMatch(/^[a-z0-9-]+$/);
        expect(section.title.length).toBeGreaterThan(0);
        expect(section.body.length).toBeGreaterThan(20);
      }
    }

    expect(await getPageContent('nope' as PageSlug)).toBeNull();
  });
});
