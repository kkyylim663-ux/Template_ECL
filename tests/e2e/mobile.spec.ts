import { expect, test } from '@playwright/test';

/**
 * The 375x812 pass: the mobile shell must appear instead of the desktop one, the
 * drawer must open and close, a tap on a card must reveal Play Now / Demo, and the
 * screenshots for review come out of these runs.
 */
test.use({ viewport: { width: 375, height: 812 } });

const SHOTS = 'C:/Users/senheng/Desktop/Claude Code/Clone web ECL/site/_scratch/shots';

/**
 * T32.6: the mobile page is one design scaled to the screen, so a metric divided
 * by the viewport width has to come out the same on every phone — 360 and 414 see
 * the same page, only bigger or smaller. The full six-width sweep lives in
 * `_scratch/t326-verify.mjs`; this is the same check at a size that runs with the
 * suite. 375 itself is asserted against the measured design values.
 */
test.describe('mobile scaling (T32.6)', () => {
  const RATIOS = ['main .container-page', '.entry-card', '.mobile-bar', '.mobile-bar a span'];

  test('one design across 320 / 360 / 375 / 390 / 414 / 430', async ({ page }) => {
    const seen: Record<string, number[]> = {};
    for (const width of [320, 360, 375, 390, 414, 430]) {
      await page.setViewportSize({ width, height: 812 });
      await page.goto('/my');
      await expect(page.locator('.mobile-bar')).toBeVisible();

      const values = await page.evaluate((selectors: string[]) => {
        const de = document.documentElement;
        return selectors.map((selector) => {
          const el = document.querySelector(selector);
          if (!el) return null;
          const box = el.getBoundingClientRect();
          // Width for the containers, height for the text metrics: both scale.
          const size = selector.includes('span') || selector === '.mobile-bar' ? box.height : box.width;
          return size / de.clientWidth;
        });
      }, RATIOS);

      values.forEach((value: number | null, index: number) => {
        if (value === null) return;
        (seen[RATIOS[index]] ??= []).push(value);
      });

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${width}px overflows`).toBeLessThanOrEqual(1);
    }

    for (const [selector, values] of Object.entries(seen)) {
      expect(values, `${selector} missing`).toHaveLength(6);
      const spread = (Math.max(...values) - Math.min(...values)) / Math.min(...values);
      expect(spread, `${selector} varies ${(spread * 100).toFixed(2)}% across widths`).toBeLessThan(0.01);
    }
  });

  test('375 is the design width: scale 1 and the measured values', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/my');

    // Scale 1 is an identity transform, so every value below is the T31/T32 one.
    await expect(page.locator('.m-root')).toHaveCSS('zoom', '1');

    const boxes = await page.evaluate(() => {
      const box = (selector: string) => {
        const el = document.querySelector(selector)!;
        const b = el.getBoundingClientRect();
        return [Math.round(b.width), Math.round(b.height), Math.round(b.left)];
      };
      return {
        content: box('main .container-page'),
        entry: box('.entry-card'),
        hero: box('.home-banner-container'),
        bar: box('.mobile-bar'),
      };
    });

    expect(boxes.content).toEqual([343, boxes.content[1], 16]);
    expect(boxes.entry.slice(0, 2)).toEqual([343, 70]);
    expect(boxes.hero.slice(0, 2)).toEqual([375, 263]);
    expect(boxes.bar.slice(0, 2)).toEqual([338, 59]);
  });

  test('past 430 the design stops growing and centres', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 812 });
    await page.goto('/my');

    const root = page.locator('.m-root');
    // The clamped factor is 430/375; compare as a number, not as a string.
    const measured = await page.evaluate(() => Number(getComputedStyle(document.querySelector('.m-root')!).zoom));
    expect(measured).toBeCloseTo(430 / 375, 5);

    const box = await root.boundingBox();
    expect(Math.round(box?.width ?? 0)).toBe(430);
    expect(Math.round(box?.x ?? 0)).toBe(85);
  });
});

test('mobile shell replaces the desktop shell', async ({ page }) => {
  await page.goto('/my');

  // Desktop chrome is in the DOM but must not be displayed at this width.
  await expect(page.locator('aside[aria-label="Side navigation"]')).toBeHidden();
  await expect(page.getByLabel('Open menu')).toBeVisible();
  await expect(page.getByLabel('Quick navigation')).toBeVisible();
  await expect(page.getByText('Install the BRAND app')).toBeVisible();

  await page.screenshot({ path: `${SHOTS}/t14-mobile-home.png` });
});

test('drawer opens, navigates and closes', async ({ page }) => {
  await page.goto('/my');

  const drawer = page.getByLabel('Mobile navigation');

  // Closed: off-screen and marked inert, so nothing inside is reachable.
  await expect(drawer).toHaveAttribute('aria-hidden', 'true');
  await expect(drawer).not.toBeInViewport();

  await page.getByLabel('Open menu').click();
  await expect(drawer).toHaveAttribute('aria-hidden', 'false');
  await expect(drawer).toBeInViewport();
  // Sections start collapsed, as on the original (`.sidemenu-child{display:none}`),
  // so the links under Games appear after its row is expanded.
  await drawer.getByRole('button', { name: 'Games' }).click();
  await expect(drawer.getByText('Slots')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/t14-mobile-drawer.png` });

  await page.getByLabel('Close menu').click();
  await expect(drawer).toHaveAttribute('aria-hidden', 'true');
  await expect(drawer).not.toBeInViewport();
});

test('a tap reveals Play Now and Demo on a card', async ({ page }) => {
  await page.goto('/my/slots?provider=pragmatic&tab=all');

  const card = page.locator('article[data-game-id]').first();
  // T33 lobby: the cover slides up (transform) instead of fading in.
  const cover = card.locator('.lobby-card__cover');
  await expect(cover).toHaveCSS('transform', /matrix\(1, 0, 0, 1, 0, [1-9]/); // translated away from 0

  await card.click();
  await expect(cover).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  await page.screenshot({ path: `${SHOTS}/t14-mobile-card-tapped.png` });

  const before = page.url();
  await card.locator('a[data-mode="real"]').click();
  await page.waitForTimeout(300);
  expect(page.url()).toBe(before);
});

test('mobile screenshots for the other key pages', async ({ page }) => {
  for (const [route, name] of [
    ['/my/livecasino', 't14-mobile-livecasino'],
    ['/my/ranking-board', 't14-mobile-ranking'],
    ['/my/login', 't14-mobile-login'],
  ] as const) {
    await page.goto(route);
    await expect(page.locator('main')).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/${name}.png` });
  }
});

/**
 * T27: the mobile + accessibility gates on the content pages. The full sweep
 * lives in `_scratch/audit-a11y.mjs` and `_scratch/audit-keyboard.mjs`; these are
 * the same checks at a size that runs with the suite.
 */
test.describe('content pages, mobile and keyboard (T27)', () => {
  test('every content-page control clears 44px', async ({ page }) => {
    const selectors = [
      ['/my/promotion', '[data-cat]'],
      ['/my/promotion', 'a[href*="/promotion/"]'],
      ['/my/tnc', '[data-toc="mobile"] [data-toc-link]'],
      ['/my/faq/finance', '[data-topic]'],
      ['/my/faq/finance', '[data-faq-item] button'],
      ['/my/contact', '[data-social]'],
      ['/my/contact', '[data-contact-form] button[type="submit"]'],
      ['/my/contact', '[data-contact-form] input'],
      ['/my/vip', '[data-vip-tier]'],
      ['/my/vip', '[data-rule-toggle]'],
      ['/my/sponsor', '[data-video]'],
    ] as const;

    for (const [route, selector] of selectors) {
      await page.goto(route);
      const nodes = page.locator(selector);
      const count = await nodes.count();
      expect(count, `${route} ${selector} matched nothing`).toBeGreaterThan(0);
      for (let index = 0; index < count; index += 1) {
        const box = await nodes.nth(index).boundingBox();
        // A closed <details> renders its links at 0x0: not a target yet.
        if (!box || box.height === 0) continue;
        expect(
          Math.round(box.height),
          `${route} ${selector}[${index}] is ${Math.round(box.width)}×${Math.round(box.height)}`,
        ).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('text keeps its contrast on the dark theme', async ({ page }) => {
    for (const route of ['/my/promotion', '/my/vip', '/my/contact', '/my/tnc']) {
      await page.goto(route);
      const worst = await page.evaluate(() => {
        type Rgba = { r: number; g: number; b: number; a: number };
        const parse = (value: string): Rgba | null => {
          const match = value.match(/rgba?\(([^)]+)\)/);
          if (!match) return null;
          const parts = match[1].split(',').map((n: string) => parseFloat(n));
          return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
        };
        const lum = (color: Rgba) => {
          const channel = (c: number) => {
            const v = c / 255;
            return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
          };
          return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
        };
        const background = (node: HTMLElement): Rgba => {
          let current: HTMLElement | null = node;
          while (current) {
            const parsed = parse(getComputedStyle(current).backgroundColor);
            if (parsed && parsed.a > 0.6) return parsed;
            current = current.parentElement;
          }
          return { r: 24, g: 25, b: 26, a: 1 };
        };

        let worst: { ratio: number; text: string } = { ratio: 21, text: '' };
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let seen = 0;
        while (walker.nextNode() && seen < 30) {
          const text = walker.currentNode.textContent?.trim() ?? '';
          const parent = walker.currentNode.parentElement;
          if (text.length < 2 || !parent || parent.closest('script, [hidden], [inert]')) continue;
          const style = getComputedStyle(parent);
          const color = parse(style.color);
          if (!color) continue;
          const l1 = lum(color);
          const l2 = lum(background(parent as HTMLElement));
          const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
          seen += 1;
          if (ratio < worst.ratio) worst = { ratio: Number(ratio.toFixed(2)), text: text.slice(0, 20) };
        }
        return worst;
      });
      expect(worst.ratio, `${route}: lowest contrast ${worst.ratio} at "${worst.text}"`).toBeGreaterThanOrEqual(
        4.5,
      );
    }
  });

  test('the dialog traps focus, closes on Esc and hands focus back', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/my/vip');

    const opener = page.locator('[data-voucher="header"]');
    await opener.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();

    for (let index = 0; index < 10; index += 1) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        return dialog ? dialog.contains(document.activeElement) : false;
      });
      expect(inside, `Tab ${index + 1} left the dialog`).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(opener).toBeFocused();
  });
});
