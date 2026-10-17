import { expect, test, type Page } from '@playwright/test';

/**
 * T69: the Current LIVE board re-reads itself every 10 s (`RANKING_REFRESH_MS`).
 * These assertions are the three the task names — one poll per interval (never
 * two), nothing polled while the tab is hidden, nothing left behind when the
 * page is left — and they can only be made against the real clock, so the spec
 * spends its time waiting for actual refreshes.
 */
const LIVE = '/my/ranking-board?board=live';
const FEED = '/api/ranking/live';
const TICK = 10_000;
/** One interval plus enough slack for a slow first request. */
const TICK_GUARD = TICK + 12_000;

/** Every live-feed call the page makes, stamped with when it was made. */
function watchFeed(page: Page): number[] {
  const calls: number[] = [];
  page.on('request', (request) => {
    if (request.url().includes(FEED)) calls.push(Date.now());
  });
  return calls;
}

/** The rows as the browser has them: member, rank and the turnover shown. */
function readRows(page: Page) {
  return page.evaluate(() => {
    const body = document.querySelector('.rb-table tbody');
    return {
      node: Boolean(body),
      rows: [...(body?.querySelectorAll('tr[data-member]') ?? [])].map((row) => ({
        member: row.getAttribute('data-member') ?? '',
        rank: Number(row.getAttribute('data-rank')),
        turnover: row.lastElementChild?.textContent ?? '',
      })),
    };
  });
}

async function gotoLive(page: Page) {
  await page.goto(LIVE);
  await expect(page.locator('.rb-table')).toBeVisible();
  // Unchanged fixture stamp: the server-rendered board is what the reference shows.
  await expect(page.locator('.rb-update p').first()).toContainText('2026-10-14 09:00');
}

test.describe('ranking live board', () => {
  test('refreshes once per interval and moves rows in place', async ({ page }) => {
    test.slow();
    const calls = watchFeed(page);
    await gotoLive(page);

    const before = await readRows(page);
    expect(before.rows).toHaveLength(10);
    // Mark the tbody: a rebuild would throw the marker away.
    await page.evaluate(() => {
      (document.querySelector('.rb-table tbody') as HTMLElement).dataset.t69 = 'kept';
    });

    await expect.poll(() => calls.length, { timeout: TICK_GUARD }).toBe(1);
    expect(await page.evaluate(() => (document.querySelector('.rb-table tbody') as HTMLElement).dataset.t69)).toBe('kept');
    // One state update carries the whole refresh — wait for the stamp it rewrites
    // rather than for the request, which lands before the rows change.
    await expect(page.locator('.rb-update p').first()).not.toContainText('2026-10-14 09:00');

    const after = await readRows(page);
    // Same members in the DOM, new numbers, a fresh stamp — no flicker, no rebuild.
    expect([...after.rows].map((row) => row.member).sort()).toEqual(
      [...before.rows].map((row) => row.member).sort(),
    );
    after.rows.forEach((row, index) => {
      expect(row.turnover).not.toBe(before.rows[index].turnover);
    });

    // The point of the board: ranks trade places, and only inside the table.
    await expect
      .poll(async () => {
        const rows = (await readRows(page)).rows;
        const now = [...rows].sort((a, b) => a.rank - b.rank).map((row) => row.member);
        return now.join(',');
      }, { timeout: 45_000 })
      .not.toBe([...before.rows].sort((a, b) => a.rank - b.rank).map((row) => row.member).join(','));
    await expect(page.locator('.rb-row--moved').first()).toBeVisible();
  });

  test('stops polling when the board is left and does not double up on return', async ({ page }) => {
    test.slow();
    const calls = watchFeed(page);
    await gotoLive(page);
    await expect.poll(() => calls.length, { timeout: TICK_GUARD }).toBe(1);

    // Off the live board — the VIP table is the fixture's and never polls. Both
    // tabs are scoped to their groups: the header rail and the nav tile also
    // answer to "VIP".
    const tiers = page.getByRole('group', { name: 'Membership tier' });
    const dates = page.getByRole('group', { name: 'Ranking dates' });
    await tiers.getByRole('link', { name: 'VIP', exact: true }).click();
    await expect(page).toHaveURL(/board=vip/);
    await expect(page.locator('.rb-update p').first()).toContainText('2026-10-14 09:00');

    await page.waitForTimeout(TICK + 5_000);
    expect(calls).toHaveLength(1);

    // Back again: one poll per interval, i.e. a single timer, not two.
    await dates.getByRole('link', { name: 'Current' }).click();
    await expect(page).toHaveURL(/board=live/);
    await expect.poll(() => calls.length, { timeout: TICK_GUARD }).toBe(2);
    expect(calls[1] - calls[0]).toBeGreaterThanOrEqual(TICK + 4_000);
    await expect.poll(() => calls.length, { timeout: TICK_GUARD }).toBe(3);
    expect(calls[2] - calls[1]).toBeGreaterThanOrEqual(TICK - 1_500);
  });

  test('pauses while the tab is hidden and catches up on return', async ({ page }) => {
    test.slow();
    const calls = watchFeed(page);
    await gotoLive(page);
    await expect.poll(() => calls.length, { timeout: TICK_GUARD }).toBe(1);

    // Playwright has no way to hide a tab; the panel reads `document.hidden` from
    // the visibilitychange handler, so a defined getter plus the event is enough.
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await page.waitForTimeout(TICK + 5_000);
    expect(calls).toHaveLength(1);

    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect.poll(() => calls.length, { timeout: 5_000 }).toBe(2);
    // It skipped the interval it slept through and re-read as soon as it was back.
    expect(calls[1] - calls[0]).toBeGreaterThanOrEqual(TICK + 4_000);
  });

  test('375: refreshes without overflow or console errors', async ({ page }) => {
    test.slow();
    const errors: string[] = [];
    page.on('console', (message) => {
      // The favicon probe is browser noise (the 404 text does not name the URL).
      const benign = (message.location()?.url ?? '').includes('/favicon.ico');
      if (message.type() === 'error' && !benign) errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(String(error)));

    await page.setViewportSize({ width: 375, height: 812 });
    const calls = watchFeed(page);
    await gotoLive(page);
    await expect.poll(() => calls.length, { timeout: TICK_GUARD }).toBe(1);

    const overflow = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth,
    }));
    expect(overflow.document).toBeLessThanOrEqual(0);
    expect(overflow.body).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });
});
