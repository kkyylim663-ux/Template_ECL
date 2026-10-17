# Caching (T73)

What this build sends, why, and how to verify it. The policy itself lives in
`lib/cache-policy.ts`; `next.config.ts` hands it to `headers()`.

Measured on 2026-10-17 with `pnpm build` + `next start -p 3410` and `curl -sI`.

## What is sent today

| Requests                                                          | `Cache-Control`                                           | Whose                        |
| ----------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------- |
| `/_next/static/**` — chunks, CSS, media (hashed names)            | `public, max-age=31536000, immutable`                     | our rule                     |
| `/api/**` — the JSON API, mock or live                            | `private, no-store`                                       | our rule                     |
| `/dev/**` — the component gallery and `/dev/wallet`               | `private, no-store`                                       | our rule                     |
| `/{my,sg}/account/**` — the member area                           | `private, no-store`                                       | our rule                     |
| `/{my,sg}/login`, `/register`, `/forgot-password`                 | `private, no-store`                                       | our rule                     |
| Public pages (`/my/slots`, `/my/promotion`, `/my/faq/finance`, …) | `private, no-cache, no-store, max-age=0, must-revalidate` | Next, dynamic default        |
| Unknown paths, and `/my/account` itself (no page there)           | same as above                                             | Next, dynamic default        |
| `/brand/logo.svg`, `/brand/tile.svg`                              | `public, max-age=0`                                       | Next, `public/` default      |
| `/sitemap.xml`                                                    | `public, max-age=0, must-revalidate`                      | Next, metadata route default |

Our rules apply to every response of a matched path, including redirects:
`/my/account/deposit` without a session answers `302` to `/my/login` and still
carries `private, no-store`. The 404 for that same path with a session does too.

`no-store` on the member area is not belt-and-braces: the shell renders the
balance and the display name server-side, so a stored copy would leak one
visitor's money to the next request on a shared cache. The language cookie is
not the only reason these pages are per-visitor.

## Why no public page is cacheable (and why that is the current decision)

**The acceptance line "public pages hit the cache on the second request" is not
met by this build, on purpose.** Every route renders per request, so a second
request re-renders rather than hitting a cache.

The cause is one line: `app/layout.tsx` calls `getShell()`, which reads the
`brand_lang` cookie through `cookies()` (`lib/i18n/server.ts:10`). In the App
Router a cookie read anywhere in the tree makes the whole route dynamic, so
`revalidate` would be ignored even if a page exported it. Adding it now would be
dead code that reads as if caching were configured.

Caching public HTML would mean giving up on the cookie for the initial render,
which is a language-switching change, not a caching change. Two ways to get
there, when someone wants them:

1. **Locale in the path** (`/en/my/slots`) — the route becomes a real cache key,
   `generateStaticParams` can prerender it, `revalidate` then applies. Costs a
   URL change and an i18n rewrite.
2. **Client-side language, shared prerendered HTML** — the shell ships one
   language-neutral page and the client swaps strings after hydration. Cheaper to
   ship, visible flash of the wrong language, and the demo-data marker would need
   moving into the client.

Until then the HTML default is the safe one, and the caching win left on the
table is small: the shell already gets its speed from the immutable
`/_next/static` output, which is what the browser waits on.

Recommended values for step 1 above, from how often each page's content actually
changes (recorded here, not in code):

| Page                                                                          | `revalidate`                                   |
| ----------------------------------------------------------------------------- | ---------------------------------------------- |
| `/` (home), `/promotion`, `/update`                                           | 300 s                                          |
| `/faq/**`, `/about`, `/tnc`, `/betting-rules`, `/contact`, `/vip`, `/sponsor` | 3600 s                                         |
| `/slots`, `/ranking-board`                                                    | 60 s                                           |
| Game halls with `searchParams` (category, filters)                            | stay dynamic — the query string is the content |

## Client-side

Every `fetch` in `lib/api/client.ts` already passes `cache: 'no-store'` (12 call
sites), so no request in the app is pulled from the browser's HTTP cache or from
Next's data cache. The `private, no-store` rule above makes the same promise to
any cache sitting between the browser and the server.

## Verifying

```bash
cd site
pnpm build
pnpm exec next start -p 3410 &
curl -sI http://127.0.0.1:3410/my/slots | grep -i cache-control   # framework default
curl -sI http://127.0.0.1:3410/api/deposit/methods | grep -i cache-control
```

Both test layers read the same policy: `tests/unit/cache-policy.test.ts` pins
every path class against `lib/cache-policy.ts` without a server, and
`tests/e2e/cache-headers.spec.ts` proves Next really applies the patterns —
the `:path*` syntax and the precedence rules are the framework's, not ours.

```bash
pnpm exec vitest run tests/unit/cache-policy.test.ts
BASE=http://127.0.0.1:3410 pnpm exec playwright test tests/e2e/cache-headers.spec.ts
```

## Not done here

- `/_next/image` — unused: `images.remotePatterns` is empty and the brand SVGs
  are served straight from `public/`.
- `/brand/*` keeps `max-age=0`, so each visit revalidates the two SVGs with an
  ETag. Unhashed filenames make a long `max-age` a stale-logo risk on a rebrand;
  left alone deliberately.
- No CDN or `s-maxage` anywhere: there is one origin, and `private` is what keeps
  a future CDN from storing member HTML.
