import { expect, test, type Page } from '@playwright/test';

/**
 * T75: this build has no `NEXT_PUBLIC_SENTRY_DSN`, so reporting must stay off —
 * no request to Sentry, and the SDK's chunk never fetched. The strongest case is
 * a forced boundary error: `reportError` runs, writes its console line, and the
 * network stays silent.
 */

/** Every request the page makes that smells like Sentry. */
function watchSentry(page: Page): string[] {
  const hits: string[] = [];
  page.on('request', (request) => {
    if (/sentry/i.test(request.url())) hits.push(request.url());
  });
  return hits;
}

test.describe('Sentry stays off without a DSN (T75)', () => {
  test('a member page loads without fetching the SDK', async ({ page }) => {
    const hits = watchSentry(page);
    await page.goto('/my');
    // Hydration is what runs instrumentation-client.ts; settle before judging.
    await page.waitForLoadState('networkidle');

    expect(hits).toEqual([]);

    const scripts = await page.evaluate(() =>
      Array.from(document.querySelectorAll('script[src]')).map(
        (script) => script.getAttribute('src') ?? '',
      ),
    );
    expect(scripts.filter((src) => /sentry/i.test(src))).toEqual([]);
  });

  test('a forced boundary error reports locally and sends nothing', async ({ page }) => {
    const hits = watchSentry(page);
    const lines: string[] = [];
    page.on('console', (message) => lines.push(message.text()));

    await page.goto('/dev/error-test?boom=1');
    await expect(page.locator('[data-testid="error-fallback"]')).toBeVisible();
    // The report is written when the boundary runs in the browser, which happens
    // at hydration — the SSR fallback is visible before that.
    await expect
      .poll(
        () =>
          lines.filter((line) => line.includes('[report-error] Error: T74 error boundary test'))
            .length,
      )
      .toBe(1);
    await page.waitForLoadState('networkidle');

    expect(hits).toEqual([]);
  });
});
