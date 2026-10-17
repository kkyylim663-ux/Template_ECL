import { providerConfig } from '@/config/providers';
import { launchBlock, type LaunchBlock, type LaunchMode } from './launch';

/**
 * Which notice a Play Now / Demo click owes the visitor.
 *
 * MOCK-ONLY: the reference build answers `realPlay` / `demoPlay` by opening the
 * game on another domain. This build never leaves the page, so a launch click
 * resolves to one of the dictionary messages below — or, for a studio the
 * provider registry marks, to that studio's own notice first. A launcher
 * installed through `setLaunchAdapter()` would take over the `coming-soon`
 * case; the login and balance answers stay either way.
 *
 * The answers: `maintenance` when the studio is down (before anything else),
 * `login_first` for a visitor who is not signed in, `credit_msg` when a member
 * has nothing to stake, and `coming_soon_game` for a member who could play.
 * Demo skips the balance question — a demo game needs no stake — so it only
 * ever shows the login or the coming-soon notice.
 */
export type LaunchGate = LaunchBlock | 'login' | 'insufficient' | 'coming-soon';

export type LaunchGateInput = {
  provider: string;
  mode: LaunchMode;
  /** False until the session route has answered; nothing can be decided yet. */
  ready: boolean;
  member: boolean;
  /** Total assets in minor units; only consulted for a signed-in `real` click. */
  balanceMinor: number;
};

/** `null` means "no dialog" — the session is not known yet, so no click is answered. */
export function launchGate({
  provider,
  mode,
  ready,
  member,
  balanceMinor,
}: LaunchGateInput): LaunchGate | null {
  // The studio answers first: its notice is owed to a guest and a member alike,
  // and no session state can change it.
  const block = launchBlock({ provider, mode });
  if (block) return block;

  if (!ready) return null;
  // Every studio in the fixture asks a guest to sign in first (`requiresLogin`);
  // one that did not would fall through to the coming-soon notice.
  if (!member) return providerConfig(provider).requiresLogin ? 'login' : 'coming-soon';
  if (mode === 'real' && balanceMinor <= 0) return 'insufficient';
  return 'coming-soon';
}

/**
 * The session half of the gate on its own: `login` for a visitor who is not
 * signed in, `insufficient` for a member with nothing to stake, `null` once a
 * member can pay. A member action that books something instead of launching a
 * game (T68's prediction SUBMIT) answers with this one — the studio block and
 * the coming-soon notice belong to a launch, not to a slip.
 */
export function sessionGate({
  ready,
  member,
  balanceMinor,
}: {
  ready: boolean;
  member: boolean;
  balanceMinor: number;
}): LaunchGate | null {
  if (!ready) return null;
  if (!member) return 'login';
  if (balanceMinor <= 0) return 'insufficient';
  return null;
}
