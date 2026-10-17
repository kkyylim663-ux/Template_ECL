import { describe, expect, it } from 'vitest';
import {
  MAX_PICKS,
  MAX_STAKE_MINOR,
  MIN_STAKE_MINOR,
  isPicked,
  pickedOptionOf,
  slipSummary,
  stakeIssue,
  togglePick,
  type Pick,
} from '@/lib/prediction-rules';

const home = (fixtureId: string): Pick => ({ fixtureId, optionId: 'home' });

describe('togglePick', () => {
  it('adds a first pick', () => {
    const next = togglePick([], home('fx-nba-1'));
    expect(next.refused).toBe(false);
    expect(next.picks).toEqual([home('fx-nba-1')]);
  });

  it('removes the pick when the same outcome is clicked again', () => {
    const next = togglePick([home('fx-nba-1')], home('fx-nba-1'));
    expect(next.picks).toEqual([]);
  });

  it('replaces the pick when another outcome of the same fixture is clicked', () => {
    const next = togglePick([home('fx-fifa-1')], { fixtureId: 'fx-fifa-1', optionId: 'draw' });
    expect(next.refused).toBe(false);
    expect(next.picks).toEqual([{ fixtureId: 'fx-fifa-1', optionId: 'draw' }]);
  });

  it('keeps one pick per fixture — two fixtures hold two picks', () => {
    const next = togglePick([home('fx-nba-1')], home('fx-fifa-1'));
    expect(next.picks).toEqual([home('fx-nba-1'), home('fx-fifa-1')]);
  });

  it('refuses the pick that would overflow the slip, and leaves the slip untouched', () => {
    let picks: Pick[] = [];
    for (let index = 0; index < MAX_PICKS; index += 1) {
      picks = togglePick(picks, home(`fx-${index}`)).picks;
    }
    expect(picks).toHaveLength(MAX_PICKS);

    const refused = togglePick(picks, home('fx-one-too-many'));
    expect(refused.refused).toBe(true);
    expect(refused.picks).toEqual(picks);
    // A refusal still lets the member change or drop what the slip holds.
    expect(togglePick(picks, { fixtureId: 'fx-0', optionId: 'away' }).refused).toBe(false);
    expect(togglePick(picks, home('fx-0')).picks).toHaveLength(MAX_PICKS - 1);
  });
});

describe('isPicked / pickedOptionOf', () => {
  const picks: Pick[] = [home('fx-nba-1')];

  it('reads the picked outcome out of the slip', () => {
    expect(isPicked(picks, 'fx-nba-1', 'home')).toBe(true);
    expect(isPicked(picks, 'fx-nba-1', 'away')).toBe(false);
    expect(isPicked(picks, 'fx-fifa-1', 'home')).toBe(false);
  });

  it('answers the fixture’s own pick, or null', () => {
    expect(pickedOptionOf(picks, 'fx-nba-1')).toBe('home');
    expect(pickedOptionOf(picks, 'fx-fifa-1')).toBeNull();
  });
});

describe('stakeIssue', () => {
  it('asks for an amount when the field is empty', () => {
    expect(stakeIssue(null)).toBe('required');
  });

  it('refuses a stake below the minimum and above the maximum', () => {
    expect(stakeIssue(MIN_STAKE_MINOR - 1)).toBe('min');
    expect(stakeIssue(MIN_STAKE_MINOR)).toBeNull();
    expect(stakeIssue(MAX_STAKE_MINOR)).toBeNull();
    expect(stakeIssue(MAX_STAKE_MINOR + 1)).toBe('max');
  });
});

describe('slipSummary', () => {
  const odds: Record<string, number> = { 'fx-nba-1:home': 2, 'fx-fifa-1:draw': 3.8 };
  const oddsOf = (pick: Pick) => odds[`${pick.fixtureId}:${pick.optionId}`] ?? null;

  it('charges the stake once per pick', () => {
    const summary = slipSummary([home('fx-nba-1'), { fixtureId: 'fx-fifa-1', optionId: 'draw' }], 250, oddsOf);
    expect(summary.picks).toBe(2);
    expect(summary.totalMinor).toBe(500);
  });

  it('adds each pick’s own odds to the potential payout, rounded to the minor unit', () => {
    const summary = slipSummary([home('fx-nba-1'), { fixtureId: 'fx-fifa-1', optionId: 'draw' }], 250, oddsOf);
    expect(summary.potentialMinor).toBe(500 + 950);
  });

  it('counts an empty slip as zero and ignores a pick whose odds are unknown', () => {
    expect(slipSummary([], 100, oddsOf)).toEqual({ picks: 0, totalMinor: 0, potentialMinor: 0 });
    const summary = slipSummary([home('fx-gone')], 100, oddsOf);
    expect(summary.totalMinor).toBe(100);
    expect(summary.potentialMinor).toBe(0);
  });
});
