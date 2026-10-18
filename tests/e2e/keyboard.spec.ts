import { expect, test, type Page } from '@playwright/test';

/**
 * T76 keyboard walkthrough: the header controls are reachable by Tab, every
 * stop shows a focus indicator, the desktop menu and the mobile drawer open
 * from the keyboard, and the dialog keeps focus inside itself, closes on Esc
 * and hands focus back to its opener.
 */
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 375, height: 812 };

/** What the currently focused element is and whether it shows a focus ring. */
type Focus = {
  tag: string;
  label: string;
  inHeader: boolean;
  outline: string;
  outlineWidth: string;
  shadow: string;
};

function readFocus(page: Page): Promise<Focus | null> {
  return page.evaluate((): Focus | null => {
    const active = document.activeElement as HTMLElement | null;
    if (!active || active === document.body) return null;
    const style = getComputedStyle(active);
    return {
      tag: active.tagName.toLowerCase(),
      label: (active.getAttribute('aria-label') ?? active.textContent ?? '').trim().slice(0, 40),
      inHeader: Boolean(active.closest('header, .app-top-bar')),
      outline: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      shadow: style.boxShadow,
    };
  });
}

function expectIndicator(focus: Focus | null, where: string) {
  expect(focus, `${where}: nothing focused`).not.toBeNull();
  // Visible focus means an outline or a ring shadow — never neither.
  const visible =
    (focus!.outline !== 'none' && focus!.outlineWidth !== '0px') || focus!.shadow !== 'none';
  expect(visible, `${where}: no focus indicator on ${focus!.tag} "${focus!.label}"`).toBe(true);
}

test.describe('keyboard', () => {
  test('Tab reaches the header controls and every stop shows a focus indicator', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/my');
    await expect(page.locator('.quest-badge')).toBeVisible();

    const stops: Focus[] = [];
    for (let step = 0; step < 8; step += 1) {
      await page.keyboard.press('Tab');
      const focus = await readFocus(page);
      expectIndicator(focus, `desktop tab stop ${step + 1}`);
      if (focus) stops.push(focus);
    }
    // The walk has to start in the shell, not somewhere in the page body.
    expect(
      stops.some((stop) => stop.inHeader),
      'Tab never reached the header',
    ).toBe(true);
  });

  test('the desktop menu opens by keyboard and closes on Esc', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/my');
    await expect(page.locator('.quest-badge')).toBeVisible();

    // The menu is its own post-hydration island (T71): wait for its panel to be
    // in the DOM, or the keypress lands before the click handler exists.
    await expect(page.locator('.menu-panel').first()).toBeAttached();
    const trigger = page.locator('header button[aria-haspopup="true"]').first();
    await trigger.focus();
    await expect(trigger).toBeFocused();
    expectIndicator(await readFocus(page), 'menu trigger');
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.menu-panel[data-open="true"]').first()).toBeVisible();

    // Tab from the trigger lands inside the open panel (its tiles are links).
    await page.keyboard.press('Tab');
    const inPanel = await page.evaluate(() =>
      Boolean(document.activeElement?.closest('.menu-panel[data-open="true"]')),
    );
    expect(inPanel, 'Tab did not move focus into the open panel').toBe(true);

    await page.keyboard.press('Escape');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('the mobile drawer opens by keyboard, closes on Esc and returns focus', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto('/my');
    await expect(page.locator('.app-top-bar')).toBeVisible();

    const burger = page.locator('.app-top-bar button[aria-expanded]').first();
    await burger.focus();
    expectIndicator(await readFocus(page), 'burger');
    await page.keyboard.press('Enter');
    await expect(burger).toHaveAttribute('aria-expanded', 'true');

    // Focus moves into the drawer panel when it opens.
    const inside = await page.evaluate(() =>
      Boolean(document.activeElement?.closest('aside[aria-label]')),
    );
    expect(inside, 'focus stayed outside the open drawer').toBe(true);

    await page.keyboard.press('Escape');
    await expect(burger).toHaveAttribute('aria-expanded', 'false');
    const back = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
    expect(back).toBe(await burger.getAttribute('aria-label'));
  });

  test('the dialog keeps focus inside, closes on Esc and hands focus back', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/my/vip');
    await expect(page.locator('.quest-badge')).toBeVisible();

    const opener = page.locator('[data-voucher="header"]');
    await opener.focus();
    await page.keyboard.press('Enter');
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    const insideDialog = () =>
      page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')));
    expect(await insideDialog(), 'focus left the dialog when it opened').toBe(true);
    for (let step = 0; step < 6; step += 1) {
      await page.keyboard.press('Tab');
      expect(await insideDialog(), `Tab ${step + 1} escaped the dialog`).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    const returned = await page.evaluate(() =>
      document.activeElement?.getAttribute('data-voucher'),
    );
    expect(returned, 'focus did not return to the opener').toBe('header');
  });
});
