import { expect, test } from '@playwright/test';
import { signIn } from './session';

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
    // The card itself is the link (`.promotion-card`), as in the reference.
    await expect(
      page.locator('article[data-promotion="pr-welcome-188"] a.promotion-card'),
    ).toHaveAttribute('href', '/my/promotion/pr-welcome-188');
  });

  test('375px lays the grid out in one column', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/my/promotion');

    const columns = await page
      .locator('ul[data-promo-grid]')
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
    // Voucher is the Function group's first row, and drawer groups start collapsed.
    await page.getByLabel('Mobile navigation').getByRole('button', { name: 'Function' }).click();
    await page.locator('[data-voucher="drawer"]').click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('a signed-in visitor gets a real answer instead', async ({ page, context }) => {
    await signIn(context);
    await page.goto('/my/promotion');

    await page.locator('[data-voucher="header"]').click();
    await page.locator('[data-voucher-form] input').fill('NOPE');
    await page.locator('[data-voucher-form] button[type="submit"]').click();

    // T66: the redeem is real now — the mock catalogue does not know this code.
    await expect(page.getByTestId('voucher-result')).toHaveAttribute('data-outcome', 'invalid');
    await expect(page.getByText('Sign in to redeem a voucher.')).toHaveCount(0);
  });
});

test.describe('update list and detail (T20)', () => {
  test('lists the six updates newest first', async ({ page }) => {
    await page.goto('/my/update');

    await expect(page.locator('article[data-update]')).toHaveCount(6);
    // The newest record leads, and the band carries the count.
    await expect(page.locator('article[data-update]').first()).toHaveAttribute(
      'data-update',
      'up-061',
    );
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
    await expect(
      page.getByText('Weekend requests are processed the next business day.'),
    ).toBeVisible();
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
    await expect(page.locator('[data-topic="gettingstart"]')).toHaveAttribute(
      'aria-current',
      'true',
    );
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

test.describe('VIP and sponsor (T22)', () => {
  test('the tier track lists the five tiers in order', async ({ page }) => {
    await page.goto('/my/vip');

    await expect(page.locator('[data-vip-tier]')).toHaveCount(5);
    await expect(page.locator('.vip-tier-track__item p.vip-tier-track__level')).toHaveText([
      'Normal',
      'Bronze',
      'Silver',
      'Gold',
      'Platinum',
    ]);
    // The track is one focusable region, like the reference's.
    await expect(page.getByRole('region', { name: 'Tier Upgrade Requirement' })).toBeVisible();
  });

  test('the privilege matrix renders one labelled column per tier', async ({ page }) => {
    await page.goto('/my/vip');

    // Two header rows (badges, then tier names) and one row per privilege group.
    await expect(page.locator('[data-vip-table] .vip-row')).toHaveCount(6);
    await expect(page.locator('[data-vip-table] .vip-level-icon')).toHaveCount(5);
    await expect(page.locator('[data-vip-table] .section-title')).toHaveText('VIP Privileges');

    // Every value row carries five tier cells; three of them highlight.
    const wrappers = await page.locator('[data-vip-table] .vip-col__wrapper').count();
    expect(wrappers).toBeGreaterThanOrEqual(12);
    await expect(page.locator('[data-vip-table] .vip-col-2 p').first()).toHaveText('Renewable');
    await expect(page.getByText('0.35%')).toBeVisible();
  });

  test('the rules block expands and collapses', async ({ page }) => {
    await page.goto('/my/vip');

    const toggle = page.locator('[data-rule-toggle]');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#info-rule-body')).toHaveCount(0);

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('heading', { name: 'How tiers are reached' })).toBeVisible();

    await toggle.click();
    await expect(page.locator('#info-rule-body')).toHaveCount(0);
  });

  test('sponsor follows the reference shell: banner, logo card, years and clips', async ({
    page,
  }) => {
    await page.goto('/my/sponsor');

    await expect(page.locator('#sponsorHeader .game-placeholder')).toHaveCount(1);
    await expect(page.locator('.logo-evolution-card')).toBeVisible();
    await expect(page.locator('.years .year')).toHaveCount(9);
    await expect(page.locator('.yearContainer')).toHaveCount(9);
    await expect(page.locator('[data-video]')).toHaveCount(9);
    await expect(page.locator('[data-short]')).toHaveCount(18);
  });

  test('a play button only says that nothing is embedded', async ({ page }) => {
    await page.goto('/my/sponsor');
    await page.locator('[data-video="vid-2026"]').click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/embeds no video/)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('nothing is embedded and no external asset is requested', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));

    await page.goto('/my/sponsor');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('iframe, video, embed, object')).toHaveCount(0);
    // Only same-origin requests: covers the covers, the carousel and the fonts.
    const external = requests.filter(
      (url) => !/^https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url),
    );
    expect(external).toEqual([]);
  });

  test('neither page scrolls sideways at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    for (const path of ['/my/sponsor', '/my/vip']) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(1);
    }
  });
});

test.describe('long-form pages (T23)', () => {
  test('tnc and betting-rules fold their clauses into accordions', async ({ page }) => {
    for (const [slug, count] of [
      ['tnc', 6],
      ['betting-rules', 5],
    ] as const) {
      await page.goto(`/my/${slug}`);
      const items = page.locator(`[data-page="${slug}"] details.accordionItem`);
      await expect(items).toHaveCount(count);

      // All clauses start closed; the first one opens by click, natively.
      const first = items.first();
      expect(await first.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(false);
      await first.locator('summary').click();
      expect(await first.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(true);
    }
  });

  test('about follows the reference shell: copy blocks and four contact columns', async ({
    page,
  }) => {
    await page.goto('/my/about');
    await expect(page.locator('[data-page="about"]')).toHaveCount(1);
    await expect(page.locator('[data-page="about"] .desc h3')).toHaveText([
      'About Us',
      'Contact Us',
    ]);
    await expect(page.locator('.contactUsContent > div')).toHaveCount(4);
    await expect(page.locator('.contactUsContent .linkTitle')).toHaveCount(4);
  });

  test('contact keeps its cards, social row and form', async ({ page }) => {
    await page.goto('/my/contact');
    await expect(page.locator('[data-toc="desktop"] [data-toc-link]')).toHaveCount(6);
    await expect(page.locator('[data-contact-card]')).toHaveCount(5);
    await expect(page.locator('[data-social]')).toHaveCount(5);
    await expect(page.locator('[data-contact-form]')).toBeVisible();
    await expect(page.locator('[data-contact-card="email"]')).toHaveAttribute(
      'href',
      'mailto:help@brand.example',
    );
  });

  test('a contents link scrolls to its section, sets the hash and the highlight', async ({
    page,
  }) => {
    await page.goto('/my/contact');

    await page.locator('[data-toc="desktop"] [data-toc-link="hours"]').click();
    await expect(page).toHaveURL(/#hours$/);

    // The smooth scroll settles with the section top under the header.
    await expect
      .poll(async () => page.locator('#hours').evaluate((el) => el.getBoundingClientRect().top))
      .toBeLessThan(300);
    await expect(page.locator('[data-toc="desktop"] [data-toc-link="hours"]')).toHaveAttribute(
      'aria-current',
      'true',
    );
    // The rail follows the reader: the first section is no longer current.
    await expect(
      page.locator('[data-toc="desktop"] [data-toc-link="channels"]'),
    ).not.toHaveAttribute('aria-current', 'true');
  });

  test('back to top appears after scrolling and returns to the top', async ({ page }) => {
    await page.goto('/my/contact');

    await expect(page.locator('[data-back-to-top]')).toBeHidden();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(600);
    await expect(page.locator('[data-back-to-top]')).toBeVisible();

    await page.locator('[data-back-to-top]').click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(5);
    await expect(page.locator('[data-back-to-top]')).toBeHidden();
  });

  test('the contact form validates per field and sends nothing', async ({ page }) => {
    await page.goto('/my/contact');

    await page.locator('[data-contact-form] button[type="submit"]').click();
    await expect(page.getByText('Enter your name')).toBeVisible();
    await expect(page.getByText('Enter a subject')).toBeVisible();
    await expect(page.getByText(/Tell us a bit more/)).toBeVisible();

    await page.fill('#contact-name', 'Ada Tan');
    await page.fill('#contact-email', 'not-an-email');
    await page.fill('#contact-subject', 'Demo question');
    await page.fill('#contact-message', 'This is a placeholder message for the demo build.');
    await page.locator('[data-contact-form] button[type="submit"]').click();
    await expect(page.getByText('Enter a valid email address')).toBeVisible();

    await page.fill('#contact-email', 'ada@example.com');
    await page.locator('[data-contact-form] button[type="submit"]').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/Nothing was sent/)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('mobile folds the contents into a dropdown, and nothing overflows', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    for (const slug of ['contact']) {
      await page.goto(`/my/${slug}`);
      await expect(page.locator('[data-toc="desktop"]')).toBeHidden();
      const dropdown = page.locator('[data-toc="mobile"]');
      await expect(dropdown).toBeVisible();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `/${slug} overflows by ${overflow}px`).toBeLessThanOrEqual(1);
    }

    // The dropdown closes once a section is picked.
    await page.goto('/my/contact');
    const dropdown = page.locator('[data-toc="mobile"]');
    await dropdown.locator('summary').click();
    await expect(dropdown).toHaveAttribute('open', '');
    await dropdown.locator('[data-toc-link="hours"]').click();
    await expect(page).toHaveURL(/#hours$/);
    await expect(dropdown).not.toHaveAttribute('open', '');
  });
});
