/**
 * The number game's rules as pure functions, so the picker, the mock store and
 * the unit tests all agree.
 *
 * What the fixture says the game is (`mocks/display.json` → `numberGame`): every
 * round draws six numbers from 1 to 49, and the history rows all carry exactly
 * six. The reference's own picker chunk was never captured (`crawl/assets/` is
 * empty, `.ng-body` ships empty), so the dial is built from the reference's CSS
 * (`.ng-spin__manual-add` / `.ng-spin__manual-pill`, the ≤768
 * `.ng-spin__body .nav-pill__wrapper` grid) and the numbers below are this
 * build's (MOCK_INVENTORY "T67 待确认").
 */
import { z } from 'zod';

/** Six numbers a round, drawn from 1 to 49 — the fixture's own shape. */
export const PICK_COUNT = 6;
export const MIN_NUMBER = 1;
export const MAX_NUMBER = 49;

/**
 * How many lines one slip may hold. The reference renders its manual grid from
 * the (uncaptured) chunk; this build keeps the two slots its stylesheet leaves
 * on show.
 */
export const MAX_LINES = 2;

/** Stakes per line, in minor units. The reference states "$1 per number". */
export const MIN_BET_MINOR = 100;
export const MAX_BET_MINOR = 100_000;

export const NUMBERS = Array.from(
  { length: MAX_NUMBER - MIN_NUMBER + 1 },
  (_, index) => MIN_NUMBER + index,
);

export type LineIssue = 'count' | 'range' | 'duplicate';

/** `null` when the line is a legal six-of-49 bet. */
export function lineIssue(line: number[]): LineIssue | null {
  if (line.length !== PICK_COUNT) return 'count';
  if (line.some((value) => !Number.isInteger(value) || value < MIN_NUMBER || value > MAX_NUMBER)) {
    return 'range';
  }
  if (new Set(line).size !== line.length) return 'duplicate';
  return null;
}

export function isCompleteLine(line: number[]): boolean {
  return lineIssue(line) === null;
}

/** A line as one stable key: sorted ascending, e.g. `[3,11,19,26,34,42]` → `3 11 19 26 34 42`. */
export function lineKey(line: number[]): string {
  return [...line].sort((a, b) => a - b).join(' ');
}

/**
 * A number click. It leaves the line that already holds the number (a second
 * click un-picks it), otherwise it lands in the first line that still has room,
 * otherwise it opens a new line while the slip has a slot left, otherwise the
 * click is refused (every line full and this number not among them).
 */
export function toggleNumberInLines(lines: number[][], value: number): number[][] {
  const holding = lines.findIndex((line) => line.includes(value));
  if (holding >= 0) {
    const next = lines.map((line, index) =>
      index === holding ? line.filter((entry) => entry !== value) : line,
    );
    // A line the click emptied falls away unless it is the slip's own first line,
    // so the free-slot count and the empty-slot row keep telling the truth.
    return next.filter((line, index) => line.length > 0 || index === 0);
  }
  const target = lines.findIndex((line) => line.length < PICK_COUNT);
  if (target >= 0) {
    return lines.map((line, index) => (index === target ? [...line, value] : line));
  }
  if (lines.length < MAX_LINES) return [...lines, [value]];
  return lines;
}

/**
 * Six distinct numbers from the range, ascending — one Random All line. The draw
 * is capped and then topped up with the lowest unused numbers, so a caller's
 * generator that keeps repeating one value (the tests' own) still ends with a
 * complete line instead of spinning.
 */
export function randomLine(random: () => number = Math.random): number[] {
  const drawn = new Set<number>();
  for (let attempt = 0; attempt < 1000 && drawn.size < PICK_COUNT; attempt += 1) {
    const value = MIN_NUMBER + Math.floor(random() * (MAX_NUMBER - MIN_NUMBER + 1));
    if (Number.isInteger(value) && value >= MIN_NUMBER && value <= MAX_NUMBER) drawn.add(value);
  }
  for (let value = MIN_NUMBER; drawn.size < PICK_COUNT && value <= MAX_NUMBER; value += 1) {
    drawn.add(value);
  }
  return [...drawn].sort((a, b) => a - b);
}

/** The whole slip at once; two identical lines are allowed (the draw picks them both). */
export function randomLines(count: number, random: () => number = Math.random): number[][] {
  return Array.from({ length: Math.min(Math.max(count, 1), MAX_LINES) }, () => randomLine(random));
}

export type AmountIssue = 'required' | 'min' | 'max';

/** `null` when the stake is inside this build's window. */
export function amountIssue(amountMinor: number | null): AmountIssue | null {
  if (amountMinor === null || !Number.isFinite(amountMinor)) return 'required';
  if (amountMinor < MIN_BET_MINOR) return 'min';
  if (amountMinor > MAX_BET_MINOR) return 'max';
  return null;
}

/** Lines that are ready to be staked. */
export function completeLines(lines: number[][]): number[][] {
  return lines.filter(isCompleteLine);
}

/**
 * 注数 is the number of complete lines, 总额 the stake times that count — the
 * slip's arithmetic, in one place.
 */
export function slipSummary(lines: number[][], amountMinor: number | null) {
  const bets = completeLines(lines);
  const stakeMinor = amountMinor ?? 0;
  return {
    bets: bets.length,
    lines: bets,
    totalMinor: bets.length * stakeMinor,
  };
}

/** The server's structural check; the panel keeps its own field messages. */
export const betDraftSchema = z.object({
  lines: z
    .array(
      z
        .array(z.number().int().min(MIN_NUMBER).max(MAX_NUMBER))
        .length(PICK_COUNT)
        .refine((line) => new Set(line).size === line.length, { message: 'duplicate' }),
    )
    .min(1)
    .max(MAX_LINES),
  amountMinor: z.number().int().min(MIN_BET_MINOR).max(MAX_BET_MINOR),
  idempotencyKey: z.string().min(1),
});

export type BetDraft = z.infer<typeof betDraftSchema>;
