import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/**
 * T76 audit helpers. T77 split the sweep in two — the public half runs in the
 * smoke suite (`a11y.spec.ts`), the member half in the member suite
 * (`a11y-member.spec.ts`) — so both import the scan/report pair from here.
 *
 * The gate is serious/critical = 0; moderate/minor findings are printed so the
 * audit trail stays visible without failing the run. The shells are
 * post-hydration islands (T71's breakpoint gates), so each scan waits for the
 * shell control of the current breakpoint first — axe must audit the settled
 * DOM, not a half-built one.
 *
 * Set `A11Y_ROUTES=/my,/my/slots` to scan a subset while iterating.
 */
export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
export const GATE = new Set(['serious', 'critical']);

export type Size = 'desktop' | 'mobile';
export type Finding = { route: string; size: Size; id: string; impact: string; nodes: string[] };

export const DESKTOP = { width: 1440, height: 900 };
export const MOBILE = { width: 375, height: 812 };

export async function scan(
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
  const shell = size === 'mobile' ? page.locator('.app-top-bar') : page.locator('.quest-badge');
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

export function report(findings: Finding[], missingShell: string[]): Finding[] {
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

export function selected(routes: string[]): string[] {
  const only = process.env.A11Y_ROUTES;
  return only
    ? routes.filter((route) => only.split(',').some((part) => route.includes(part)))
    : routes;
}
