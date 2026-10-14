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
  /** Rolling turnover needed to reach the tier. */
  thresholdMinor: z.number().int().min(0),
  short: z.string(),
  benefits: z.array(z.string()),
});
export type VipLevel = z.infer<typeof vipLevelSchema>;

export const vipLevelListSchema = z.array(vipLevelSchema);

export const vipPayloadSchema = z.object({
  levels: vipLevelListSchema,
  /** Rules block under the tier track (markdown subset). */
  rules: z.string(),
});
export type VipPayload = z.infer<typeof vipPayloadSchema>;

/* ------------------------------------------------------------------ sponsor */

export const sponsorPayloadSchema = z.object({
  logoEvolution: z.array(
    z.object({
      id: z.string(),
      era: z.string(),
      label: z.string(),
      tone: z.number().int().min(0).max(359),
    }),
  ),
  videos: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      duration: z.string(),
      tone: z.number().int().min(0).max(359),
    }),
  ),
  partners: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      kind: z.string(),
      tone: z.number().int().min(0).max(359),
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
export const predictionFixtureSchema = z.object({
  id: z.string(),
  league: z.enum(PREDICTION_LEAGUES),
  home: z.string(),
  away: z.string(),
  startsAt: z.string(),
  options: z.array(z.object({ id: z.string(), label: z.string(), odds: z.number() })),
});
export type PredictionFixture = z.infer<typeof predictionFixtureSchema>;

export const displayPayloadSchema = z.object({
  providersByCategory: categoryProviderMapSchema,
  fourD: z.array(drawResultSchema),
  numberGame: numberGameSchema,
  prediction: z.array(predictionFixtureSchema),
});
export type DisplayPayload = z.infer<typeof displayPayloadSchema>;

/* ------------------------------------------------------------------ campaigns */

export const LEADERBOARD_KINDS = ['weekly', 'monthly', 'supervip', 'vip', 'live', 'lastweek'] as const;
export const LeaderboardKindSchema = z.enum(LEADERBOARD_KINDS);
export type LeaderboardKind = z.infer<typeof LeaderboardKindSchema>;

export const leaderboardRowSchema = z.object({
  rank: z.number().int().min(1),
  /** Always masked: the public board never shows a full username. */
  displayName: z.string(),
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
