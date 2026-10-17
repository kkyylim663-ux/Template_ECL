import { describe, expect, it } from 'vitest';
import {
  MAX_LINES,
  amountIssue,
  completeLines,
  isCompleteLine,
  lineIssue,
  lineKey,
  randomLine,
  randomLines,
  slipSummary,
  toggleNumberInLines,
} from '@/lib/numbergame-rules';

describe('number game rules', () => {
  it('a line is legal only with six distinct numbers from 1 to 49', () => {
    expect(lineIssue([1, 2, 3, 4, 5, 6])).toBeNull();
    expect(lineIssue([1, 2, 3, 4, 5])).toBe('count');
    expect(lineIssue([1, 2, 3, 4, 5, 50])).toBe('range');
    expect(lineIssue([0, 2, 3, 4, 5, 6])).toBe('range');
    expect(lineIssue([1, 2, 3, 4, 5, 5])).toBe('duplicate');
    expect(isCompleteLine([7, 8, 9, 10, 11, 12])).toBe(true);
    expect(completeLines([[1, 2, 3, 4, 5, 6], [1, 2], []])).toHaveLength(1);
  });

  it('a click lands in the first line with room, and un-picks from the line that holds it', () => {
    let lines: number[][] = [[]];
    for (const value of [3, 11, 19, 26, 34, 42]) lines = toggleNumberInLines(lines, value);
    expect(lines).toEqual([[3, 11, 19, 26, 34, 42]]);

    // The line is full: a new number opens the second one.
    lines = toggleNumberInLines(lines, 7);
    expect(lines[1]).toEqual([7]);

    // Every line is full and the number is not among them: the click is refused.
    const full = [
      [1, 2, 3, 4, 5, 6],
      [7, 8, 9, 10, 11, 12],
    ];
    expect(toggleNumberInLines(full, 13)).toEqual(full);

    // A second click on a marked number takes it back off.
    expect(toggleNumberInLines([[1, 2, 3]], 2)).toEqual([[1, 3]]);

    // Un-picking the only number of a later line drops that line, so the slip's
    // free-slot count goes back up; the first line always stays.
    expect(toggleNumberInLines([[1, 2, 3, 4, 5, 6], [7]], 7)).toEqual([[1, 2, 3, 4, 5, 6]]);
    expect(toggleNumberInLines([[9]], 9)).toEqual([[]]);
  });

  it('random lines are complete, ascending and distinct', () => {
    const line = randomLine();
    expect(isCompleteLine(line)).toBe(true);
    expect(line).toEqual([...line].sort((a, b) => a - b));

    const lines = randomLines(MAX_LINES);
    expect(lines).toHaveLength(MAX_LINES);
    expect(lines.every(isCompleteLine)).toBe(true);

    // A fed generator still yields a complete line: the draw is capped and topped
    // up, so a repeating value cannot spin here.
    const sequence = [0, 0.05, 0.1, 0.15, 0.2, 0.25];
    let step = 0;
    const fed = () => sequence[step++ % sequence.length];
    expect(randomLine(fed)).toEqual([1, 3, 5, 8, 10, 13]);
    expect(randomLine(() => 0)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(randomLines(99).length).toBe(MAX_LINES);
  });

  it('the stake window and the slip arithmetic', () => {
    expect(amountIssue(null)).toBe('required');
    expect(amountIssue(99)).toBe('min');
    expect(amountIssue(100)).toBeNull();
    expect(amountIssue(100_000)).toBeNull();
    expect(amountIssue(100_001)).toBe('max');

    const lines = [
      [3, 11, 19, 26, 34, 42],
      [7, 8, 9, 10, 11, 12],
      [],
    ];
    expect(slipSummary(lines, 250)).toEqual({
      bets: 2,
      lines: [
        [3, 11, 19, 26, 34, 42],
        [7, 8, 9, 10, 11, 12],
      ],
      totalMinor: 500,
    });
    // An unreadable stake leaves the total at zero rather than NaN.
    expect(slipSummary(lines, null).totalMinor).toBe(0);
  });

  it('a line reads back as its sorted key', () => {
    expect(lineKey([42, 3, 19, 11, 34, 26])).toBe('3 11 19 26 34 42');
  });
});
