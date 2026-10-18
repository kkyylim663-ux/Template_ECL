#!/usr/bin/env node
/**
 * T77: `pnpm test:e2e` — runs the e2e suites concurrently, one Playwright
 * process per suite. Each suite gets its own port and its own
 * `.mock-data/<suite>` (playwright.config.ts reads E2E_SUITE); inside a suite
 * the tests stay serial, so nothing shares a writable mock fixture.
 *
 *   node scripts/run-e2e-suites.mjs                # every suite
 *   node scripts/run-e2e-suites.mjs smoke member   # a subset
 *   node scripts/run-e2e-suites.mjs visual -- --update-snapshots
 *                                                  # extra args go to Playwright
 */
import { spawn } from 'node:child_process';

/** Keep in sync with playwright.config.ts. */
const SUITES = ['smoke', 'game', 'member', 'content', 'visual'];

const argv = process.argv.slice(2);
const dashDash = argv.indexOf('--');
const suiteArgs = dashDash === -1 ? argv : argv.slice(0, dashDash);
const extraArgs = dashDash === -1 ? [] : argv.slice(dashDash + 1);

const unknown = suiteArgs.filter((s) => !SUITES.includes(s));
if (unknown.length) {
  console.error(`unknown suite(s): ${unknown.join(', ')} — expected ${SUITES.join(', ')}`);
  process.exit(2);
}
const suites = suiteArgs.length ? suiteArgs : SUITES;

const startedAt = Date.now();
const results = new Map();
const children = new Set();

function report() {
  const failed = [...results.values()].filter((r) => r.code !== 0).length;
  const width = Math.max(...[...results.keys()].map((s) => s.length));
  console.log(`\n── e2e suites ──────────────────────────────`);
  for (const [suite, r] of [...results].sort((a, b) => b[1].secs - a[1].secs)) {
    console.log(`${suite.padEnd(width)}  ${r.code === 0 ? 'ok  ' : 'FAIL'}  ${r.secs}s`);
  }
  const total = ((Date.now() - startedAt) / 1000).toFixed(0);
  console.log(`total wall ${total}s (${suites.length} suites in parallel, workers=1 each)`);
  process.exitCode = failed ? 1 : 0;
}

for (const suite of suites) {
  const start = Date.now();
  const child = spawn('pnpm exec playwright test', [...extraArgs], {
    shell: true,
    env: { ...process.env, E2E_SUITE: suite, MOCK_DATA_DIR: `.mock-data/${suite}` },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.add(child);

  const prefix = `[${suite}] `;
  const pipe = (stream) => {
    let buf = '';
    stream.on('data', (chunk) => {
      buf += chunk.toString();
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) if (line.trim()) console.log(prefix + line);
    });
    stream.on('end', () => {
      if (buf.trim()) console.log(prefix + buf);
    });
  };
  pipe(child.stdout);
  pipe(child.stderr);

  child.on('exit', (code) => {
    children.delete(child);
    results.set(suite, { code: code ?? 1, secs: ((Date.now() - start) / 1000).toFixed(0) });
    if (results.size === suites.length) report();
  });
}

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    for (const child of children) child.kill();
    process.exit(130);
  });
}
