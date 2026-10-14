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

export const promotionSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  /** Bonus percentage, 0 for a non-percentage offer (e.g. a rebate). */
  bonusPct: z.number().min(0),
  maxBonusMinor: z.number().int().min(0),
  rolloverMultiplier: z.number().min(0),
  validUntil: z.string(),
  tone: z.number().int().min(0).max(359),
});
export type Promotion = z.infer<typeof promotionSchema>;

export const bannerListSchema = z.array(bannerSchema);
export const announcementListSchema = z.array(announcementSchema);
export const promotionListSchema = z.array(promotionSchema);

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
