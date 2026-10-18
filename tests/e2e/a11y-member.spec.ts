import { expect, test } from '@playwright/test';
import { accountRoutes } from './routes';
import { signIn } from './session';
import { report, scan, selected, type Finding } from './a11y-helpers';

/**
 * T76 audit, member half (T77 moved it here from `a11y.spec.ts` so the member
 * suite carries the signed-in sweep and the smoke suite stays shorter).
 */
test.describe('axe sweep', () => {
  test('member routes: WCAG A/AA at both sizes', async ({ page, context }) => {
    test.setTimeout(20 * 60_000);
    await signIn(context);
    const findings: Finding[] = [];
    const missingShell: string[] = [];
    for (const route of selected(accountRoutes())) {
      findings.push(...(await scan(page, route, 'desktop', missingShell)));
      findings.push(...(await scan(page, route, 'mobile', missingShell)));
    }
    expect(report(findings, missingShell)).toEqual([]);
  });
});
