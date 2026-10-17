import { describe, expect, it } from 'vitest';
import { launchGate, type LaunchGateInput } from '@/lib/game/launch-gate';

/** A signed-in member with money in the main wallet. */
const member: LaunchGateInput = {
  mode: 'real',
  ready: true,
  member: true,
  balanceMinor: 122450,
};

const guest: LaunchGateInput = { ...member, member: false, balanceMinor: 0 };
const broke: LaunchGateInput = { ...member, balanceMinor: 0 };

describe('launchGate', () => {
  it('answers nothing until the session is known', () => {
    expect(launchGate({ ...member, ready: false })).toBeNull();
    expect(launchGate({ ...guest, ready: false })).toBeNull();
  });

  it('asks a guest to sign in before either Play Now or Demo', () => {
    expect(launchGate(guest)).toBe('login');
    expect(launchGate({ ...guest, mode: 'demo' })).toBe('login');
  });

  it('points a member with zero credit at the deposit page', () => {
    expect(launchGate(broke)).toBe('insufficient');
    // Defensive: a negative balance is not "has funds".
    expect(launchGate({ ...broke, balanceMinor: -1 })).toBe('insufficient');
  });

  it('never asks a demo about the balance', () => {
    expect(launchGate({ ...broke, mode: 'demo' })).toBe('coming-soon');
  });

  it('tells a member who could play that the build does not launch games', () => {
    expect(launchGate(member)).toBe('coming-soon');
    expect(launchGate({ ...member, mode: 'demo' })).toBe('coming-soon');
  });
});
