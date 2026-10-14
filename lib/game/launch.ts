/**
 * Game launch URLs.
 *
 * P0 is browse-only: the reference build builds a `launchinggame` URL per
 * provider (`realPlay` / `demoPlay`) on a separate domain, and this project must
 * not enter a game at all. So every Play Now / Demo link resolves through this
 * one function, which currently always answers `#`.
 *
 * Wiring real launching later means changing this function (and nothing else):
 * callers only ever ask for the href and attach `data-*` attributes.
 */
export const LAUNCH_HREF = '#';

export type LaunchMode = 'real' | 'demo';

export type LaunchTarget = {
  provider: string;
  gameId: string;
  mode: LaunchMode;
};

export function getLaunchHref(_target?: Partial<LaunchTarget>): string {
  return LAUNCH_HREF;
}
