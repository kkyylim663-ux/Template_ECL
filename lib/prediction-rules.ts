/**
 * The prediction slip's rules as pure functions, so the board, the mock store and
 * the unit tests all agree.
 *
 * What the reference shows: `crawl/pages/my_prediction.html` renders the five
 * status pills and an empty `.pd-card-list`, and its own slip chunk was never
 * captured, so the slip's shapes below are this build's (MOCK_INVENTORY "T68"):
 * one pick per fixture, `MAX_PICKS` picks per slip, one stake for the whole slip,
 * and `Min.`/`Max.` from the stake window the other gaming slips use.
 */
import { z } from 'zod';

/** One outcome the member picked: a fixture and one of its options. */
export type Pick = { fixtureId: string; optionId: string };

/**
 * How many picks one slip may hold. The reference's slip was not captured; three
 * is this build's number (MOCK_INVENTORY "T68"), matching the three fixtures a
 * member can see at once on a desktop row.
 */
export const MAX_PICKS = 3;

/** Stakes for the whole slip, in minor units — the same window as the other slips. */
export const MIN_STAKE_MINOR = 100;
export const MAX_STAKE_MINOR = 100_000;

/**
 * The history row's event for a prediction ticket. The reference's own history
 * filter lists four events (`ebMyNumberGameWeekly` / `ebMyNba2024` /
 * `ebMyPreEuro2024` / `ebMyEuro2024`) and none of them covers a FIFA pick, so
 * this build adds the fifth — see MOCK_INVENTORY "T68".
 */
export const PREDICTION_EVENT = 'prediction';

export function pickKey(pick: Pick): string {
  return `${pick.fixtureId}:${pick.optionId}`;
}

export function isPicked(picks: Pick[], fixtureId: string, optionId: string): boolean {
  return picks.some((pick) => pick.fixtureId === fixtureId && pick.optionId === optionId);
}

/**
 * One option click. It removes the pick when the same outcome is clicked again,
 * replaces the fixture's pick when another of its outcomes is clicked (one pick
 * per fixture), otherwise it appends while the slip has room — and reports the
 * refusal when every slot is taken by another fixture.
 */
export function togglePick(picks: Pick[], next: Pick): { picks: Pick[]; refused: boolean } {
  const same = picks.findIndex(
    (pick) => pick.fixtureId === next.fixtureId && pick.optionId === next.optionId,
  );
  if (same >= 0) return { picks: picks.filter((_, index) => index !== same), refused: false };

  const held = picks.findIndex((pick) => pick.fixtureId === next.fixtureId);
  if (held >= 0) {
    return { picks: picks.map((pick, index) => (index === held ? next : pick)), refused: false };
  }

  if (picks.length >= MAX_PICKS) return { picks, refused: true };
  return { picks: [...picks, next], refused: false };
}

/** The fixture ids a slip already holds — a card uses it to show its own pick. */
export function pickedOptionOf(picks: Pick[], fixtureId: string): string | null {
  return picks.find((pick) => pick.fixtureId === fixtureId)?.optionId ?? null;
}

export type StakeIssue = 'required' | 'min' | 'max';

/** `null` when the stake is inside this build's window. */
export function stakeIssue(amountMinor: number | null): StakeIssue | null {
  if (amountMinor === null || !Number.isFinite(amountMinor)) return 'required';
  if (amountMinor < MIN_STAKE_MINOR) return 'min';
  if (amountMinor > MAX_STAKE_MINOR) return 'max';
  return null;
}

/**
 * The slip's arithmetic in one place: the stake is charged once per pick, and the
 * potential payout adds each pick's own odds (rounded to the minor unit, the way
 * a bookmaker would settle it).
 */
export function slipSummary(
  picks: Pick[],
  amountMinor: number | null,
  oddsOf: (pick: Pick) => number | null,
) {
  const stakeMinor = amountMinor ?? 0;
  const potentialMinor = picks.reduce((total, pick) => {
    const odds = oddsOf(pick);
    return odds === null ? total : total + Math.round(stakeMinor * odds);
  }, 0);
  return {
    picks: picks.length,
    totalMinor: picks.length * stakeMinor,
    potentialMinor,
  };
}

/**
 * The server's structural check. The stake window and the pick count stay with
 * the store so each rejection keeps its own code (`210`–`216`).
 */
export const predictionBetSchema = z.object({
  picks: z
    .array(z.object({ fixtureId: z.string().min(1), optionId: z.string().min(1) }))
    .max(50),
  amountMinor: z.number().int(),
  idempotencyKey: z.string().min(1),
});

export type PredictionBetDraft = z.infer<typeof predictionBetSchema>;
