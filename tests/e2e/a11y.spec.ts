import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { accountRoutes, publicRoutes } from './routes';
import { signIn } from './session';

/**
 * T76 audit: every route at both breakpoints against axe's WCAG 2.0/2.1 A + AA
 * rule sets. The gate is serious/critical = 0; moderate/minor findings are
 * printed so the audit trail stays visible without failing the run.
 *
 * The shells are post-hydration islands (T71's breakpoint gates), so each scan
 * waits for the shell control of the current breakpoint first — axe must audit
 * the settled DOM, not a half-built one.
 *
 * Set `A11Y_ROUTES=/my,/my/slots` to scan a subset while iterating.
 */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const GATE = new Set(['serious', 'critical']);

type Size = 'desktop' | 'mobile';
type Finding = { route: string; size: Size; id: string; impact: string; nodes: string[] };

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 375, height: 812 };

async function scan(
  page: Page,
  route: string,
  size: Size,
  missingShell: string[],
): Promise<Finding[]> {
  await page.setViewportSize(size === 'desktop' ? DESKTOP : MOBILE);
  const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
  expect(response?.status(), `${route} status`).toBe(200);

  // The mobile chrome's root (`.app-top-bar`) exists on every route; the public
  // pages' bottom bar does not, so it would cost a 5s wait per member page.
  const shell = size === 'mobile' ? page.locator('.app-top-bar') : page.locator('.quest-pill');
  const settled = await shell
    .first()
    .waitFor({ state: 'visible', timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  if (!settled) missingShell.push(`${route} (${size})`);

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const findings: Finding[] = results.violations.map((violation) => ({
    route,
    size,
    id: violation.id,
    impact: violation.impact ?? 'unknown',
    nodes: violation.nodes.slice(0, 3).map((node) => node.target.join(' ')),
  }));
  // Stream gated findings: a killed run still leaves the inventory behind.
  for (const finding of findings.filter((candidate) => GATE.has(candidate.impact))) {
    console.log(
      `[a11y:${finding.impact}] ${finding.id} @ ${finding.route} (${finding.size}) ${finding.nodes.join(' | ')}`,
    );
  }
  return findings;
}

function report(findings: Finding[], missingShell: string[]): Finding[] {
  const gated = findings.filter((finding) => GATE.has(finding.impact));
  const rest = findings.filter((finding) => !GATE.has(finding.impact));
  console.log(`[a11y] gated (serious/critical): ${gated.length}; below gate: ${rest.length}`);
  console.log(
    `[a11y] shell wait missed on: ${missingShell.length ? missingShell.join(', ') : 'none'}`,
  );
  for (const finding of rest) {
    console.log(
      `[a11y:${finding.impact}] ${finding.id} @ ${finding.route} (${finding.size}) ${finding.nodes.join(' | ')}`,
    );
  }
  return gated;
}

function selected(routes: string[]): string[] {
  const only = process.env.A11Y_ROUTES;
  return only
    ? routes.filter((route) => only.split(',').some((part) => route.includes(part)))
    : routes;
}

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
