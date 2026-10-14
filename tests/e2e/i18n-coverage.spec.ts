import { expect, test } from '@playwright/test';

/**
 * T16 acceptance: with the language on `zh-Hans`, the pages that existed before
 * P1 must not show English UI copy any more.
 *
 * The markers below are interface strings only. Mock DATA (game titles, bank
 * names, announcement text) is deliberately still English — it comes from
 * `mocks/` and a real backend supplies it per market later.
 */
const ENGLISH_MARKERS = [
  'Quick entry',
  'Game studios',
  'Featured promotions',
  'View all',
  'Get the app',
  'Play Now',
  'Search games',
  'Clear search',
  'Could not load these titles',
  'My account',
  'Total balance',
  'Transaction history',
  'Pending transactions',
  'Ticket center',
  'Member since',
  'Sign in',
  'Create account',
  'Reset password',
  'Base components',
  'Quick navigation',
  'Notify',
];

const PUBLIC_ROUTES = [
  '/my',
  '/my/slots',
  '/my/fast-game',
  '/my/livecasino',
  '/my/sports',
  '/my/esports',
  '/my/4d',
  '/my/numbergame',
  '/my/prediction',
  '/my/ranking-board',
  '/my/login',
  '/my/register',
  '/my/forgot-password',
];

const MEMBER_ROUTES = [
  '/my/account/deposit',
  '/my/account/withdrawal',
  '/my/account/transfer',
  '/my/account/history',
  '/my/account/pending',
  '/my/account/inbox',
  '/my/account/rebates',
  '/my/account/achievement',
  '/my/account/tickets',
  '/my/account/profile',
];

/**
 * Rendered markup only: scripts (inline RSC payload), metadata tags and `<head>`
 * are dropped. Metadata is T24's scope — a streamed response even re-emits
 * `<title>`/`<meta>` inside the body, and those are still static English until
 * generateMetadata lands. What is left is exactly the copy a reader sees.
 */
function visible(html: string): string {
  const end = html.indexOf('</head>');
  const body = end === -1 ? html : html.slice(end);
  return body
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<title[\s\S]*?<\/title>/g, '')
    .replace(/<(meta|link)[^>]*>/g, '');
}

const ZH = 'brand_lang=zh-Hans';
const SESSION = 'brand_session=demo';

/**
 * A key no provider can resolve renders as its own name (e.g.
 * `games.card.playNow`) — what a namespace missing from the page's scope looks
 * like. Two dots keep this clear of anything the mock data would print.
 */
const RAW_KEY = /\b(common|nav|games|home|auth|account|content|meta)\.[a-z][\w]*\.[\w.]+/;

for (const route of PUBLIC_ROUTES) {
  test(`${route} has no English UI copy in zh-Hans`, async ({ request }) => {
    const html = visible(await (await request.get(route, { headers: { cookie: ZH } })).text());
    expect(html).toContain('游戏'); // the shell switched language
    for (const marker of ENGLISH_MARKERS) {
      expect(html, `${route} still shows "${marker}"`).not.toContain(marker);
    }
    expect(html, `${route} shows an unresolved message key`).not.toMatch(RAW_KEY);
  });
}

test('/dev/components has no English UI copy in zh-Hans', async ({ request }) => {
  const html = visible(
    await (await request.get('/dev/components', { headers: { cookie: ZH } })).text(),
  );
  expect(html).toContain('基础组件');
  for (const marker of ENGLISH_MARKERS) {
    expect(html, `dev page still shows "${marker}"`).not.toContain(marker);
  }
});

for (const route of MEMBER_ROUTES) {
  test(`${route} has no English UI copy in zh-Hans`, async ({ request }) => {
    const html = visible(
      await (await request.get(route, { headers: { cookie: `${ZH}; ${SESSION}` } })).text(),
    );
    expect(html).toContain('我的账户');
    for (const marker of ENGLISH_MARKERS) {
      expect(html, `${route} still shows "${marker}"`).not.toContain(marker);
    }
  });
}
