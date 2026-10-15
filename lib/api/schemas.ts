import { z } from 'zod';

/** Response envelope shared by every endpoint: `status === '0'` means success. */
export const apiEnvelopeSchema = z.object({
  status: z.string(),
  msg: z.string(),
  d: z.unknown(),
});

export type ApiEnvelope<T = unknown> = {
  status: string;
  msg: string;
  d: T;
};

/* ------------------------------------------------------------------ game list */

/**
 * One game record. The captured data carries the id under three different
 * spellings depending on the provider — `gameId` (most), `gamecode` (pt-style)
 * and `gameCode` (the rest) — so all three are accepted and normalised by
 * `gameCardId()`. Unknown extra keys (`hd`, `jp`, `t`, …) are stripped.
 */
export const gameDetailSchema = z
  .object({
    name: z.string(),
    img: z.string(),
    gameId: z.string().optional(),
    gamecode: z.string().optional(),
    gameCode: z.string().optional(),
  })
  .refine((detail) => Boolean(detail.gameId ?? detail.gamecode ?? detail.gameCode), {
    message: 'a game detail record needs gameId, gamecode or gameCode',
  });
export type GameDetail = z.infer<typeof gameDetailSchema>;

/** Stable id for a card, whichever spelling the provider used. */
export function gameCardId(detail: GameDetail): string {
  return detail.gameId ?? detail.gamecode ?? detail.gameCode ?? '';
}

/**
 * `d` of the slots payload. Shape per docs/API_OBSERVED.md:
 * - `g`: provider ids (28 of them)
 * - `details[provider][gameId]`: name / gameId / img (6121 entries total)
 * - `games[provider][tab]`: game ids; tabs differ per provider
 */
export const gameListDataSchema = z.object({
  g: z.array(z.string()),
  details: z.record(z.string(), z.record(z.string(), gameDetailSchema)),
  games: z.record(z.string(), z.record(z.string(), z.array(z.string()))),
  load: z.number().optional(),
});
export type GameListData = z.infer<typeof gameListDataSchema>;

/* -------------------------------------------------------------------- content */

export const bannerSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string(),
  /** Internal path, or `#` when the target does not exist yet. */
  href: z.string(),
  /** Hue for the placeholder artwork until real images are dropped in. */
  tone: z.number().int().min(0).max(359),
  order: z.number().int(),
});
export type Banner = z.infer<typeof bannerSchema>;

export const announcementSchema = z.object({
  id: z.string(),
  kind: z.enum(['info', 'promo', 'urgent']),
  title: z.string(),
  body: z.string(),
  publishedAt: z.string(),
});
export type Announcement = z.infer<typeof announcementSchema>;

/** Tabs on the promotion list page, minus the "all" tab the UI adds. */
export const PROMOTION_CATEGORIES = [
  'deposit',
  'rebate',
  'casino',
  'sports',
  'slots',
  'referral',
  'vip',
  /** Tournament and event offers. Empty between campaigns — the UI says so. */
  'events',
] as const;

export const promotionSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  /** Which tab the offer sits under on the promotion list page. */
  category: z.enum(PROMOTION_CATEGORIES),
  /** Bonus percentage, 0 for a non-percentage offer (e.g. a rebate). */
  bonusPct: z.number().min(0),
  maxBonusMinor: z.number().int().min(0),
  rolloverMultiplier: z.number().min(0),
  startsAt: z.string(),
  endsAt: z.string(),
  /** Hue for the placeholder banner until a real image is dropped in. */
  tone: z.number().int().min(0).max(359),
  /** Rules body. Markdown subset: headings, lists, tables, bold links. */
  rules: z.string(),
});
export type Promotion = z.infer<typeof promotionSchema>;

export const bannerListSchema = z.array(bannerSchema);
export const announcementListSchema = z.array(announcementSchema);
export const promotionListSchema = z.array(promotionSchema);

/* ------------------------------------------------------------------ updates */

export const updateSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  publishedAt: z.string(),
  tone: z.number().int().min(0).max(359),
  /** Body, same markdown subset as a promotion's `rules`. */
  body: z.string(),
});
export type Update = z.infer<typeof updateSchema>;

export const updateListSchema = z.array(updateSchema);

/* ---------------------------------------------------------------------- faq */

export const faqItemSchema = z.object({ id: z.string(), q: z.string(), a: z.string() });
export type FaqItem = z.infer<typeof faqItemSchema>;

export const faqTopicSchema = z.object({
  id: z.string(),
  title: z.string(),
  items: z.array(faqItemSchema),
});
export type FaqTopic = z.infer<typeof faqTopicSchema>;

/** Sidebar shape: the topic without its questions, plus the count. */
export const faqTopicSummarySchema = faqTopicSchema.omit({ items: true }).extend({
  count: z.number().int().min(0),
});
export type FaqTopicSummary = z.infer<typeof faqTopicSummarySchema>;

export const faqTopicListSchema = z.array(faqTopicSummarySchema);

/* ---------------------------------------------------------------------- vip */

export const vipLevelSchema = z.object({
  id: z.string(),
  level: z.number().int().min(1),
  name: z.string(),
  /** Track line under the tier name (desktop only). */
  desc: z.string(),
  /** Amount line of the track (desktop only). */
  amount: z.string(),
  /** Short label that replaces desc/amount where the track folds on phones. */
  short: z.string(),
});
export type VipLevel = z.infer<typeof vipLevelSchema>;

export const vipLevelListSchema = z.array(vipLevelSchema);

/** One privilege line of the `vip-table__wrapper` matrix: values keyed by tier id. */
export const vipPrivilegeRowSchema = z.object({
  id: z.string(),
  label: z.string(),
  /** The values are minor units and are formatted with the region currency. */
  money: z.boolean().optional(),
  values: z.record(z.string(), z.string()),
});
export type VipPrivilegeRow = z.infer<typeof vipPrivilegeRowSchema>;

export const vipPrivilegeGroupSchema = z.object({
  id: z.string(),
  label: z.string(),
  rows: z.array(vipPrivilegeRowSchema),
});
export type VipPrivilegeGroup = z.infer<typeof vipPrivilegeGroupSchema>;

export const vipPayloadSchema = z.object({
  levels: vipLevelListSchema,
  privileges: z.array(vipPrivilegeGroupSchema),
  /** Rules block under the tier track (markdown subset). */
  rules: z.string(),
});
export type VipPayload = z.infer<typeof vipPayloadSchema>;

/* ------------------------------------------------------------------ sponsor */

export const sponsorPayloadSchema = z.object({
  logo: z.object({
    periodDesktop: z.string(),
    periodMobile: z.string(),
    toneOriginal: z.number().int().min(0).max(359),
    toneCurrent: z.number().int().min(0).max(359),
  }),
  /** One entry per `yearContainer` on the reference page. */
  years: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      videoId: z.string(),
      videoTitle: z.string(),
      videoTone: z.number().int().min(0).max(359),
      shortsTitle: z.string(),
      shorts: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          tone: z.number().int().min(0).max(359),
        }),
      ),
    }),
  ),
});
export type SponsorPayload = z.infer<typeof sponsorPayloadSchema>;

/* ------------------------------------------------------------- long-form pages */

export const PAGE_SLUGS = ['about', 'contact', 'tnc', 'betting-rules'] as const;
export type PageSlug = (typeof PAGE_SLUGS)[number];

export function isPageSlug(value: string): value is PageSlug {
  return (PAGE_SLUGS as readonly string[]).includes(value);
}

export const pageSectionSchema = z.object({
  /** Anchor id used by the table of contents. */
  id: z.string(),
  title: z.string(),
  body: z.string(),
});
export type PageSection = z.infer<typeof pageSectionSchema>;

export const pageContentSchema = z.object({
  slug: z.string(),
  title: z.string(),
  updatedAt: z.string(),
  sections: z.array(pageSectionSchema),
});
export type PageContent = z.infer<typeof pageContentSchema>;

/* ------------------------------------------------- -- display (non-slots) pages */

/** Studio ids shown as cards on a game page, keyed by category slug. */
export const categoryProviderMapSchema = z.record(z.string(), z.array(z.string()));
export type CategoryProviderMap = z.infer<typeof categoryProviderMapSchema>;

export const drawResultSchema = z.object({
  draw: z.string(),
  date: z.string(),
  first: z.string(),
  second: z.string(),
  third: z.string(),
  tone: z.number().int().min(0).max(359),
});
export type DrawResult = z.infer<typeof drawResultSchema>;

export const drawnRoundSchema = z.object({
  round: z.string(),
  numbers: z.array(z.number().int()),
  drawnAt: z.string(),
});
export type DrawnRound = z.infer<typeof drawnRoundSchema>;

export const numberGameSchema = drawnRoundSchema.extend({
  history: z.array(drawnRoundSchema),
});
export type NumberGame = z.infer<typeof numberGameSchema>;

export const PREDICTION_LEAGUES = ['NBA', 'FIFA', 'UEFA'] as const;
/** The five tabs on the prediction page filter on this, in the reference's order. */
export const PREDICTION_STATUSES = ['active', 'upcoming', 'ended'] as const;
export const predictionFixtureSchema = z.object({
  id: z.string(),
  league: z.enum(PREDICTION_LEAGUES),
  status: z.enum(PREDICTION_STATUSES),
  home: z.string(),
  away: z.string(),
  startsAt: z.string(),
  prizePoolMinor: z.number().int().min(0),
  options: z.array(z.object({ id: z.string(), label: z.string(), odds: z.number() })),
});
export type PredictionFixture = z.infer<typeof predictionFixtureSchema>;
export type PredictionStatus = (typeof PREDICTION_STATUSES)[number];

export const displayPayloadSchema = z.object({
  providersByCategory: categoryProviderMapSchema,
  /** Studios wearing the red "New" tag, per category (`.game-card__label.new`). */
  newProviders: z.record(z.string(), z.array(z.string())).optional(),
  /** The VPN modal's demo credentials (`.vpn-download__*`). */
  vpnDemo: z.object({
    loginId: z.string(),
    password: z.string(),
    link: z.string().url(),
  }),
  fourD: z.array(drawResultSchema),
  numberGame: numberGameSchema,
  prediction: z.array(predictionFixtureSchema),
});
export type DisplayPayload = z.infer<typeof displayPayloadSchema>;
export type VpnDemo = DisplayPayload['vpnDemo'];

/* ------------------------------------------------------------------- 4D */

export const lotteryBookSchema = z.object({
  id: z.string(),
  name: z.string(),
  date: z.string(),
  first: z.string(),
  second: z.string(),
  third: z.string(),
  /** Ten 4-digit numbers under Special, ten under Consolation. */
  special: z.array(z.string()),
  consolation: z.array(z.string()),
});
export type LotteryBook = z.infer<typeof lotteryBookSchema>;

export const lotteryPayoutSchema = z.object({
  id: z.string(),
  title: z.string(),
  desc: z.string(),
  head: z.array(z.string()),
  rows: z.array(z.object({ label: z.string(), amount: z.string() })),
});
export type LotteryPayout = z.infer<typeof lotteryPayoutSchema>;

export const lotteryResultsSchema = z.object({
  payout: z.array(lotteryPayoutSchema),
  books: z.array(lotteryBookSchema),
  rules: z.object({
    items: z.array(z.object({ title: z.string().optional(), body: z.string() })),
  }),
});
export type LotteryResults = z.infer<typeof lotteryResultsSchema>;

/* -------------------------------------------------------- ranking board */

/**
 * Rule prose keeps its inline markup (`<strong>` / `<em>` / `<br>`) exactly as
 * the reference renders it. The value comes from `mocks/ranking-board.json`, a
 * local import with no user input anywhere in the path; the page injects it with
 * `dangerouslySetInnerHTML`.
 */
export const rankingContentSchema = z.object({
  prizeStructure: z.array(z.object({ rank: z.string(), prize: z.string() })),
  prizePools: z.record(z.string(), z.object({ weekly: z.number(), monthly: z.number() })),
  rules: z.object({
    intro: z.array(z.object({ title: z.string().optional(), html: z.string() })),
    tnc: z.array(z.object({ title: z.string().optional(), html: z.string() })),
  }),
  refreshMinutes: z.number().int(),
});
export type RankingContent = z.infer<typeof rankingContentSchema>;

/* ------------------------------------------------------------------ campaigns */

export const LEADERBOARD_KINDS = ['weekly', 'monthly', 'supervip', 'vip', 'live', 'lastweek'] as const;
export const LeaderboardKindSchema = z.enum(LEADERBOARD_KINDS);
export type LeaderboardKind = z.infer<typeof LeaderboardKindSchema>;

export const leaderboardRowSchema = z.object({
  rank: z.number().int().min(1),
  /** Always masked: the public board never shows a full username. */
  displayName: z.string(),
  /** Market the member plays from — the board's third column (`.rb-table`). */
  region: z.enum(['MY', 'SG', 'VN']),
  turnoverMinor: z.number().int().min(0),
  prizeMinor: z.number().int().min(0),
});
export type LeaderboardRow = z.infer<typeof leaderboardRowSchema>;

export const leaderboardSchema = z.object({
  kind: LeaderboardKindSchema,
  title: z.string(),
  currency: z.string(),
  refreshedAt: z.string(),
  rows: z.array(leaderboardRowSchema),
});
export type Leaderboard = z.infer<typeof leaderboardSchema>;

export const leaderboardMapSchema = z.record(z.string(), leaderboardSchema);

/* ----------------------------------------------------- home betting (T32) */

/**
 * The two tables the home page shows in one block: recent stakes and the day's
 * biggest winners. The game column mirrors the original's typeid map.
 */
export const BET_TYPES = ['slots', 'live-casino', 'sports', 'esports'] as const;
export type BetType = (typeof BET_TYPES)[number];

export const homeBetSchema = z.object({
  id: z.string(),
  type: z.enum(BET_TYPES),
  /** Always masked, as on the reference build. */
  account: z.string(),
  betAt: z.string(),
  region: z.string(),
  usdBetMinor: z.number().int().min(0),
});
export type HomeBet = z.infer<typeof homeBetSchema>;

export const homeWinnerSchema = z.object({
  rank: z.number().int().min(1),
  account: z.string(),
  region: z.string(),
  usdWinMinor: z.number().int().min(0),
});
export type HomeWinner = z.infer<typeof homeWinnerSchema>;

export const homeBettingSchema = z.object({
  allBets: z.array(homeBetSchema),
  topDailyWinner: z.array(homeWinnerSchema),
});
export type HomeBetting = z.infer<typeof homeBettingSchema>;

/* ------------------------------------------------------- account (demo data) */

export const walletSchema = z.object({
  code: z.string(),
  name: z.string(),
  kind: z.enum(['main', 'game']),
  amountMinor: z.number().int(),
  tone: z.number().int().min(0).max(359),
  /** False when the provider is offline; the UI greys the row out. */
  available: z.boolean(),
});
export type Wallet = z.infer<typeof walletSchema>;

export const bankSchema = z.object({
  id: z.string(),
  name: z.string(),
  accountName: z.string(),
  accountNumber: z.string(),
  tone: z.number().int().min(0).max(359),
});

export const savedBankAccountSchema = z.object({
  id: z.string(),
  bankId: z.string(),
  accountName: z.string(),
  accountNumberMasked: z.string(),
  verified: z.boolean(),
  addedAt: z.string(),
});

export const depositChannelSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(['ewallet', 'online-banking', 'qr']),
  minAmountMinor: z.number().int(),
  maxAmountMinor: z.number().int(),
  feePct: z.number(),
  tone: z.number().int().min(0).max(359),
});

export const TRANSACTION_KINDS = ['deposit', 'withdrawal', 'transfer', 'rebate', 'bonus'] as const;
export const TRANSACTION_STATUSES = [
  'pending',
  'processing',
  'approved',
  'rejected',
  'cancelled',
] as const;

export const accountTransactionSchema = z.object({
  id: z.string(),
  reference: z.string(),
  kind: z.enum(TRANSACTION_KINDS),
  status: z.enum(TRANSACTION_STATUSES),
  amountMinor: z.number().int(),
  methodLabel: z.string(),
  createdAt: z.string(),
  note: z.string().optional(),
});
export type AccountTransaction = z.infer<typeof accountTransactionSchema>;

export const inboxMessageSchema = z.object({
  id: z.string(),
  kind: z.enum(['important', 'others']),
  subject: z.string(),
  body: z.string(),
  read: z.boolean(),
  receivedAt: z.string(),
});

export const rebateSchema = z.object({
  id: z.string(),
  period: z.string(),
  product: z.string(),
  turnoverMinor: z.number().int(),
  ratePct: z.number(),
  amountMinor: z.number().int(),
  status: z.enum(['pending', 'claimable', 'claimed']),
  claimableAt: z.string(),
});

export const achievementSchema = z.object({
  id: z.string(),
  gameType: z.enum(['livecasino', 'sports', 'slots']),
  title: z.string(),
  requirementMinor: z.number().int(),
  progressMinor: z.number().int(),
  rewardMinor: z.number().int(),
  status: z.enum(['locked', 'in-progress', 'claimable', 'claimed']),
});

export const ticketEventSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  opensAt: z.string(),
  closesAt: z.string(),
  ticketsHeld: z.number().int(),
  ticketsRequired: z.number().int(),
  status: z.enum(['upcoming', 'open', 'closed']),
});

export const rolloverSchema = z.object({
  id: z.string(),
  title: z.string(),
  requirementMinor: z.number().int(),
  progressMinor: z.number().int(),
  expiresAt: z.string(),
});

export const accountProfileSchema = z.object({
  username: z.string(),
  nickname: z.string(),
  fullName: z.string(),
  email: z.string(),
  mobileMasked: z.string(),
  vipTier: z.string(),
  kycStatus: z.enum(['unverified', 'pending', 'verified']),
  joinedAt: z.string(),
});

export const accountPayloadSchema = z.object({
  profile: accountProfileSchema,
  autoTransfer: z.boolean(),
  wallets: z.array(walletSchema),
  bankAccounts: z.array(savedBankAccountSchema),
  banks: z.array(bankSchema),
  channels: z.array(depositChannelSchema),
  transactions: z.array(accountTransactionSchema),
  inbox: z.array(inboxMessageSchema),
  rebates: z.array(rebateSchema),
  achievements: z.array(achievementSchema),
  tickets: z.array(ticketEventSchema),
  promotionRollover: z.array(rolloverSchema),
});
export type AccountPayload = z.infer<typeof accountPayloadSchema>;
