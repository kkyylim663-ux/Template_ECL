# Brand site (frontend-only demo build)

A mock-mode Next.js 15 build of the member-facing brand site: every route of the
reference, no real backend. All data comes from `mocks/` through `lib/api/`, the
brand is configurable in `config/brand.ts`, and the game entries are inert (`#`)
until the real backend lands. See `docs/` for the caching policy and the fidelity
notes, and `../ecl-site/` for the task list and progress log.

## Getting started

```bash
pnpm install                 # pnpm 12; build-script approvals live in pnpm-workspace.yaml
cp .env.example .env.local   # defaults are already the working configuration
pnpm dev                     # http://localhost:3000
```

Production build and serve:

```bash
pnpm build && pnpm start     # :3000. Kill any old `next start` first — it keeps serving the old .next
```

## Tests

```bash
pnpm test:unit               # vitest: pure logic (money, rules, stores, tokens)
pnpm test:e2e                # every e2e suite, run in parallel (see below)
pnpm test:budget             # HTML/JS budgets; needs a server on :3000
pnpm test                    # unit + e2e
```

### The e2e suites (T77)

The e2e specs are grouped into four journey suites plus the visual-regression
suite, one Playwright project each:

| suite     | covers                                                                 |
| --------- | ---------------------------------------------------------------------- |
| `smoke`   | every public route answers; shell, metadata (seo/i18n), keyboard, a11y  |
| `game`    | lobby browsing, Play Now gate/adapter, ranking, number game, prediction |
| `member`  | sign-in/registration, transfer, deposits, withdrawals, account pages    |
| `content` | the content pages (promotions, updates, FAQ, vip, sponsor…)             |
| `visual`  | the desktop 1440×900 and mobile 375×812 screenshot baselines            |

`pnpm test:e2e` starts all of them at once — one `next start` per suite, each on
its own port (smoke 3101, game 3102, member 3103, content 3104, visual 3105) and
its own `MOCK_DATA_DIR` (`.mock-data/<suite>/`). That is what makes the suites
safe to run concurrently: no two suites can share a writable mock fixture.
**Within a suite the tests stay serial** (`workers: 1`) — one fixture directory
per suite means one test at a time, which is how the specs were written.

Run a subset (one or more suites):

```bash
pnpm test:e2e smoke            # or: game / member / content / visual
pnpm test:e2e member game      # several, still in parallel
```

Anything after `--` goes to Playwright:

```bash
pnpm test:e2e visual -- --update-snapshots    # see "Visual baselines"
pnpm test:e2e smoke -- --grep "member area"   # a single test
```

Ad-hoc runs without a suite (e.g. `pnpm exec playwright test tests/e2e/smoke.spec.ts`)
fall back to the pre-suite behaviour: one server on :3000, one shared `.mock-data`.

### Visual baselines

Screenshots live in `tests/e2e/visual.spec.ts-snapshots/<desktop|mobile>-<page>.png`
(98 images). Each capture is compared with `maxDiffPixelRatio: 0.002` (0.2%) and
`animations: 'disabled'`; the ticket countdown is masked. Baselines are committed.

Update them **only for a reviewed change** — a baseline that moved for a reason
you cannot name is a bug, not a baseline:

```bash
pnpm test:e2e visual -- --update-snapshots                             # both sizes, every route
pnpm test:e2e visual -- --update-snapshots -g "/my/account/rebates"    # one route
```

Then look at the diff (`git diff --stat` and the changed PNGs) before committing.
A change to `--mobile-content-top`, a colour token or a shell level moves many
captures at once; that is expected when the change is deliberate.

### Failure artifacts

Every failing test keeps its trace (and a screenshot) under
`test-results/<suite>/<test>/`; replay one with:

```bash
pnpm exec playwright show-trace test-results/member/<test>/trace.zip
```

An HTML report per suite lands in `playwright-report/<suite>/index.html`
(opened manually — the runner never opens a browser).

### Mock data directories

Writable mock stores (claims, tickets, orders, withdrawals, users…) write JSON
files into `MOCK_DATA_DIR`, default `.mock-data/`, seeded from `mocks/` when the
file is absent. Specs drop a store file before a test when they need the seed
state; they resolve the path through `tests/e2e/mock-data.ts`, which reads the
same `MOCK_DATA_DIR` the suite's server was started with.
