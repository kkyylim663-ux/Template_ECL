import type { LaunchMode } from './launch';

/**
 * Which notice a Play Now / Demo click owes the visitor.
 *
 * MOCK-ONLY: the reference build answers `realPlay` / `demoPlay` by opening the
 * game on another domain. This build never leaves the page, so the three
 * dictionary messages below are what a launch click resolves to; wiring real
 * launching (T62's adapter) replaces this decision, not its callers.
 *
 * The three answers: `login_first` for a visitor who is not signed in,
 * `credit_msg` when a member has nothing to stake, and `coming_soon_game` for a
 * member who could play. Demo skips the balance question — a demo game needs no
 * stake — so it only ever shows the login or the coming-soon notice.
 */
export type LaunchGate = 'login' | 'insufficient' | 'coming-soon';

export type LaunchGateInput = {
  mode: LaunchMode;
  /** False until the session route has answered; nothing can be decided yet. */
  ready: boolean;
  member: boolean;
  /** Total assets in minor units; only consulted for a signed-in `real` click. */
  balanceMinor: number;
};

/** `null` means "no dialog" — the session is not known yet, so no click is answered. */
export function launchGate({
  mode,
  ready,
  member,
  balanceMinor,
}: LaunchGateInput): LaunchGate | null {
  if (!ready) return null;
  if (!member) return 'login';
  if (mode === 'real' && balanceMinor <= 0) return 'insufficient';
  return 'coming-soon';
}
