import { expect, test } from '@playwright/test';

/**
 * The browsing flow that matters for P0: studio → category → search → launch.
 * "Launch" must never navigate: every Play Now and Demo resolves to `#` through
 * getLaunchHref(), so the URL has to stay exactly where it was.
 */
test.describe('game browsing flow', () => {
  test('slots: studio, category, search and an inert Play Now', async ({ page }) => {
    await page.goto('/my/slots?provider=pragmatic&tab=all');

    // First page only: 24 cards, never the whole 698.
    const cards = page.locator('article[data-game-id]');
    await expect(cards).toHaveCount(24);
    await expect(page.getByText(/Showing 24 of 698/)).toBeVisible();

    // Category switch reloads the grid and updates the URL.
    await page.click('[role=tablist] button:has-text("Top")');
    await expect(page).toHaveURL(/tab=top/);
    await expect(page.getByText('Showing 24 of 26 — scroll for more')).toBeVisible();

    // Search by name, case-insensitive.
    await page.fill('input[aria-label="Search games"]', 'olympus');
    await expect(page).toHaveURL(/q=olympus/);
    await expect(page.locator('.lobby-grid article')).not.toHaveCount(0);

    const results = await cards.count();
    expect(results).toBeGreaterThan(0);
    expect(results).toBeLessThanOrEqual(24);

    // The first card's Play Now swallows its own click. Since T61 it answers
    // with the sign-in notice, which has to be dismissed before the search box
    // and the clear button below are reachable again.
    const before = page.url();
    await cards.first().locator('a[data-mode="real"]').click();
    await page.waitForTimeout(300);
    expect(page.url()).toBe(before);
    await expect(cards.first().locator('a[data-mode="real"]')).toHaveAttribute('href', '#');
    await page.keyboard.press('Escape');
    await expect(page.locator('[role=dialog]')).toHaveCount(0);

    // An empty result set explains itself and can be cleared.
    await page.fill('input[aria-label="Search games"]', 'zzzzqq');
    await expect(page.getByText(/No title matches/)).toBeVisible();
    await page.click('text=Clear search');
    await expect(page.locator('.lobby-grid article').first()).toBeVisible();
  });

  test('a different studio brings its own category tabs', async ({ page }) => {
    await page.goto('/my/slots?provider=pt&tab=new');
    await expect(page.getByText(/Showing 24 of 88/)).toBeVisible();

    const tabs = page.locator('[role=tablist] button');
    await expect(tabs).toHaveCount(8);

    // Switching studio is a normal navigation and keeps working.
    await page.click('a[href*="provider=joker"][href*="slots"]');
    await expect(page).toHaveURL(/provider=joker/);
    await expect(page.locator('article[data-game-id]')).toHaveCount(24);
  });

  test('fast-game reuses the same lobby', async ({ page }) => {
    await page.goto('/my/fast-game?provider=pt&tab=new');
    await expect(page.getByText(/Showing 24 of 88/)).toBeVisible();
    await expect(page.locator('article[data-game-id]')).toHaveCount(24);
  });

  test('live casino warns about a VPN instead of launching', async ({ page }) => {
    await page.goto('/my/livecasino');
    // T34: the Play button lives in the hover panel — hover the card first, as
    // the reference build requires.
    const card = page.locator('article[data-provider]').first();
    const play = card.locator('a[data-mode="real"]');
    // The reveal is a hover animation: a click that lands mid-animation loses the
    // hover, and the retry loop then waits on a hidden button. Re-hover per attempt.
    await expect(async () => {
      // Centre the card: `scrollIntoViewIfNeeded` would park it at the top edge,
      // where the sticky header intercepts the Play button.
      await card.evaluate((el) => (el as HTMLElement).scrollIntoView({ block: 'center' }));
      await card.hover();
      await play.click({ timeout: 5_000 });
    }).toPass({ timeout: 30_000 });
    await expect(page.locator('[role=dialog]')).toContainText('VPN');
    await page.keyboard.press('Escape');
    await expect(page.locator('[role=dialog]')).toHaveCount(0);
  });

  test('4D shows the seven operator cards and opens its rules panel', async ({ page }) => {
    await page.goto('/my/4d');

    // Seven cards, each carrying its own 1st/2nd/3rd prize line.
    const cards = page.locator('.lottery-result__card');
    await expect(cards).toHaveCount(7);
    await expect(cards.first()).toContainText('Magnum - 4D');
    await expect(cards.first()).toContainText('6319');

    // The rule panel is a `<details>`: closed until its header is clicked.
    const content = page.locator('.info-rule__content');
    await expect(content).toBeHidden();
    await page.click('.info-rule__header');
    await expect(content).toBeVisible();
    await expect(content).toContainText('Big Forecast');
  });

  test('ranking board: each of the six buttons selects its board', async ({ page }) => {
    await page.goto('/my/ranking-board');

    for (const kind of ['monthly', 'supervip', 'vip', 'live', 'lastweek', 'weekly']) {
      const button = page.locator(`.rb-board a[href*="board=${kind}"]`);
      await button.click();
      await expect(button).toHaveClass(/is-selected/);
      await expect(page.locator('.rb-table tbody tr')).toHaveCount(10);
    }

    // The period button also drives the summary line above the table.
    await page.click('.rb-board a[href*="board=monthly"]');
    await expect(page.locator('.rb-stat').nth(1)).toContainText('Monthly');
  });

  test('home page links all resolve or are inert', async ({ page }) => {
    const failures: string[] = [];
    page.on('response', (response) => {
      if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
    });

    await page.goto('/my');
    // T26 replaced the Swiper carousel with the in-house track.
    await expect(page.locator('[data-banner-slide]')).toHaveCount(5);
    await expect(page.locator('[data-entry]')).toHaveCount(4);

    const hrefs = new Set(
      await page.$$eval('a[href]', (nodes) => nodes.map((node) => node.getAttribute('href') ?? '')),
    );
    for (const href of hrefs) {
      if (!href.startsWith('/')) continue;
      const response = await page.request.get(href, { maxRedirects: 0 });
      expect([200, 302, 307], `${href} answered ${response.status()}`).toContain(response.status());
    }

    expect(failures, 'failed requests while loading the home page').toEqual([]);
  });
});
