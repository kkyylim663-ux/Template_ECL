import { expect, test } from '@playwright/test';

/**
 * Content pages (T18 onwards). Each block grows with the task that ships the
 * page; the assertions here are the acceptance points written down as tests.
 */

test.describe('promotion list (T18)', () => {
  test('lists every offer with the category row', async ({ page }) => {
    await page.goto('/my/promotion');

    await expect(page.locator('[data-page="promotion-list"]')).toBeVisible();
    await expect(page.locator('article[data-promotion]')).toHaveCount(8);
    // eight category tabs plus "All"
    await expect(page.locator('[data-cat]')).toHaveCount(9);
    await expect(page.locator('a[data-cat][aria-current]')).toHaveText('All');
  });

  test('a category tab filters the grid, keeps the URL and survives a reload', async ({ page }) => {
    await page.goto('/my/promotion');
    await page.locator('a[data-cat="deposit"]').click();

    await expect(page).toHaveURL(/cat=deposit/);
    await expect(page.locator('article[data-promotion]')).toHaveCount(2);
    await expect(page.getByText('2 offers')).toBeVisible();

    await page.reload();
    await expect(page.locator('article[data-promotion]')).toHaveCount(2);
    await expect(page.locator('a[data-cat="deposit"]')).toHaveAttribute('aria-current', 'true');
  });

  test('an empty category explains itself', async ({ page }) => {
    await page.goto('/my/promotion?cat=events');

    await expect(page.locator('article[data-promotion]')).toHaveCount(0);
    await expect(page.getByText('No offers in this category yet')).toBeVisible();
  });

  test('cards link to their detail page', async ({ page }) => {
    await page.goto('/my/promotion');
    await expect(
      page.locator('article[data-promotion="pr-welcome-188"] a', { hasText: 'View details' }),
    ).toHaveAttribute('href', '/my/promotion/pr-welcome-188');
  });

  test('375px lays the grid out in one column', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/my/promotion');

    const columns = await page
      .locator('ul.grid')
      .first()
      .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(1);

    const box = await page.locator('article[data-promotion]').first().boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(300);
  });
});

test.describe('promotion detail and the voucher dialog (T19)', () => {
  test('renders the banner, the rules and the paging', async ({ page }) => {
    await page.goto('/my/promotion/pr-welcome-188');

    await expect(page.locator('[data-part="promotion-detail__banner"]')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Welcome bonus 188%');

    // Markdown subset: heading, list item and a table cell all render as elements.
    await expect(page.getByRole('heading', { name: 'How this bonus works' })).toBeVisible();
    await expect(page.getByText('Minimum deposit: RM 50')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Live casino' })).toBeVisible();

    await expect(page.locator('[data-part="promotion-detail__back"]')).toBeVisible();
    await expect(page.getByRole('link', { name: /Next offer/ })).toHaveAttribute(
      'href',
      '/my/promotion/pr-daily-reload-18',
    );
    // The first offer has nothing before it.
    await expect(page.getByRole('link', { name: /Previous offer/ })).toHaveCount(0);
  });

  test('an unknown id is a 404', async ({ request }) => {
    expect((await request.get('/my/promotion/pr-nope')).status()).toBe(404);
  });

  test('the dialog opens from the header, Escape closes it, a guest is asked to sign in', async ({
    page,
  }) => {
    await page.goto('/my/promotion');

    await page.locator('[data-voucher="header"]').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);

    // Empty submit explains itself, then a guest is pointed at sign-in.
    await page.locator('[data-voucher="header"]').click();
    await page.locator('[data-voucher-form] button[type="submit"]').click();
    await expect(page.getByText('Enter a code first')).toBeVisible();

    await page.locator('[data-voucher-form] input').fill('WELCOME188');
    await page.locator('[data-voucher-form] button[type="submit"]').click();
    await expect(page.getByText('Sign in to redeem a voucher.')).toBeVisible();
  });

  test('the drawer carries the same dialog on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/my/promotion');

    await page.getByLabel('Open menu').click();
    await page.locator('[data-voucher="drawer"]').click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('a signed-in visitor gets the demo result instead', async ({ page, context }) => {
    await context.addCookies([
      { name: 'brand_session', value: 'demo', url: 'http://127.0.0.1:3000' },
    ]);
    await page.goto('/my/promotion');

    await page.locator('[data-voucher="header"]').click();
    await page.locator('[data-voucher-form] input').fill('WELCOME188');
    await page.locator('[data-voucher-form] button[type="submit"]').click();

    await expect(page.getByText(/looks well-formed/)).toBeVisible();
    await expect(page.getByText('Sign in to redeem a voucher.')).toHaveCount(0);
  });
});

test.describe('update list and detail (T20)', () => {
  test('lists the six updates newest first', async ({ page }) => {
    await page.goto('/my/update');

    await expect(page.locator('article[data-update]')).toHaveCount(6);
    // The newest record leads, and the band carries the count.
    await expect(page.locator('article[data-update]').first()).toHaveAttribute('data-update', 'up-061');
    await expect(page.getByText('6 updates')).toBeVisible();
  });

  test('a card opens the detail page with the rendered body', async ({ page }) => {
    await page.goto('/my/update');
    await page.locator('article[data-update="up-059"] a').click();

    await expect(page).toHaveURL(/\/my\/update\/up-059$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Withdrawal cut-off extended to 23:00',
    );
    await expect(page.getByRole('heading', { name: 'Later cut-off' })).toBeVisible();
    await expect(page.getByText('Weekend requests are processed the next business day.')).toBeVisible();
  });

  test('paging walks the published order', async ({ page }) => {
    await page.goto('/my/update/up-060');

    // up-061 is newer, up-059 is older.
    await expect(page.getByRole('link', { name: /Previous update/ })).toHaveAttribute(
      'href',
      '/my/update/up-061',
    );
    await expect(page.getByRole('link', { name: /Next update/ })).toHaveAttribute(
      'href',
      '/my/update/up-059',
    );

    // The newest item has nothing before it.
    await page.goto('/my/update/up-061');
    await expect(page.getByRole('link', { name: /Previous update/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Next update/ })).toBeVisible();
  });

  test('an unknown id is a 404', async ({ request }) => {
    expect((await request.get('/my/update/up-999')).status()).toBe(404);
  });
});

test.describe('FAQ (T21)', () => {
  test('shows the eight topics and opens the first one by default', async ({ page }) => {
    await page.goto('/my/faq/gettingstart');

    await expect(page.locator('[data-topic]')).toHaveCount(8);
    await expect(page.locator('[data-topic="gettingstart"]')).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('[data-faq-topic="gettingstart"]')).toBeVisible();
  });

  test('switching topics swaps the questions', async ({ page }) => {
    await page.goto('/my/faq/gettingstart');
    await page.locator('[data-topic="finance"]').click();

    await expect(page).toHaveURL(/\/my\/faq\/finance$/);
    await expect(page.locator('[data-faq-topic="finance"]')).toBeVisible();
    await expect(page.getByText('What are the withdrawal limits?')).toBeVisible();
    await expect(page.getByText('Which username can I choose?')).toHaveCount(0);
  });

  test('the accordion opens the first answer and toggles on click', async ({ page }) => {
    await page.goto('/my/faq/finance');

    const first = page.locator('[data-faq-item]').first();
    const button = first.getByRole('button');
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(first.locator('[id$="-answer"]')).toBeVisible();

    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(first.locator('[id$="-answer"]')).toHaveCount(0);

    await button.click();
    await expect(first.locator('[id$="-answer"]')).toBeVisible();
  });

  test('search filters inside the topic and highlights the term', async ({ page }) => {
    await page.goto('/my/faq/finance');

    await page.fill('input[type="search"]', 'document check');
    const items = page.locator('[data-faq-item]');
    await expect(items).toHaveCount(1);
    await expect(page.getByText(/1 match for/)).toBeVisible();
    // The match is highlighted in the question, not only filtered.
    await expect(page.locator('mark')).toHaveText(/document check/i);

    await page.fill('input[type="search"]', 'zzzznothing');
    await expect(items).toHaveCount(0);
    await expect(page.getByText(/Nothing matches/)).toBeVisible();
    await page.getByRole('button', { name: 'Clear search' }).click();
    await expect(items).toHaveCount(7);
  });

  test('/faq forwards to the first topic', async ({ page }) => {
    await page.goto('/my/faq');
    await expect(page).toHaveURL(/\/my\/faq\/gettingstart$/);
  });

  test('the eight legacy paths answer 301', async ({ request }) => {
    const topics = [
      'gettingstart',
      'finance',
      'statement',
      'games',
      'events',
      'promotions',
      'contactus',
      'downloadapp',
    ];
    for (const region of ['my', 'sg']) {
      for (const topic of topics) {
        const response = await request.get(`/${region}/${topic}`, { maxRedirects: 0 });
        expect(response.status(), `/${region}/${topic}`).toBe(301);
        expect(response.headers()['location'], `/${region}/${topic}`).toBe(
          `/${region}/faq/${topic}`,
        );
      }
    }
  });
});
