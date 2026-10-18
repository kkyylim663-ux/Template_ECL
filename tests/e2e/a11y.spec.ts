import { expect, test } from '@playwright/test';
import { publicRoutes } from './routes';
import { report, scan, selected, type Finding } from './a11y-helpers';

/**
 * T76 audit: every public route at both breakpoints against axe's WCAG 2.0/2.1
 * A + AA rule sets. T77 moved the member half into `a11y-member.spec.ts` (the
 * member suite), so the smoke suite carries only this sweep.
 */
test.describe('axe sweep', () => {
  test('public routes: WCAG A/AA at both sizes', async ({ page }) => {
    test.setTimeout(20 * 60_000);
    const findings: Finding[] = [];
    const missingShell: string[] = [];
    for (const route of selected(publicRoutes())) {
      findings.push(...(await scan(page, route, 'desktop', missingShell)));
      findings.push(...(await scan(page, route, 'mobile', missingShell)));
    }
    expect(report(findings, missingShell)).toEqual([]);
  });
});
