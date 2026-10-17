import { providerConfig } from '@/config/providers';

/**
 * Game launch URLs.
 *
 * The reference build answers a Play Now / Demo click by opening the game on a
 * separate `launchinggame` domain. This build never enters a game, so every
 * such link resolves through `getLaunchHref()`, which hands back the href, the
 * window the game would open in, and the status that decided it. Today the href
 * is always `#`: the only way a real address can enter a page is a launcher
 * installed through `setLaunchAdapter()`.
 */
export const LAUNCH_HREF = '#';

export type LaunchMode = 'real' | 'demo';

/** Where a game would open once a launcher exists. */
export type LaunchWindow = '_blank' | '_self';

/**
 * What a click resolves to. `ready` means nothing stands in its way.
 * `maintenance` and `demo-unavailable` are facts about the studio rather than
 * the visitor, so they are answered before the session is consulted.
 */
export type LaunchStatus = 'ready' | 'maintenance' | 'demo-unavailable';

/** The statuses that mean a click cannot go through — the ones a notice explains. */
export type LaunchBlock = Exclude<LaunchStatus, 'ready'>;

export type LaunchTarget = {
  provider: string;
  gameId: string;
  mode: LaunchMode;
};

/** The finalized contract (T62): the link takes `href`; `target` and `status` say why. */
export type LaunchResolution = {
  href: string;
  target: LaunchWindow;
  status: LaunchStatus;
};

/**
 * A real launcher: given a target it hands back the address to open, or `null`
 * when it cannot launch that game.
 */
export type LaunchAdapter = (
  target: LaunchTarget,
) => { href: string; target?: LaunchWindow } | null;

let adapter: LaunchAdapter | null = null;

/**
 * The one injection point (`LAUNCH_ADAPTER` in TASKS_P5). Wiring real launching
 * means installing a launcher here; no caller changes. Tests install a fake to
 * prove the seam — the shipped build never calls this, which is what keeps
 * every href `#`.
 */
export function setLaunchAdapter(next: LaunchAdapter | null): void {
  adapter = next;
}

export function getLaunchAdapter(): LaunchAdapter | null {
  return adapter;
}

/**
 * The provider-level block, shared with `launch-gate.ts` so the link and the
 * dialog can never disagree. `null` means the studio itself does not stand in
 * the way of this click. A studio without a Demo action (`supportsDemo: false`)
 * never renders that action, so `demo-unavailable` is a guard rather than a
 * state this build reaches through the UI.
 */
export function launchBlock(target: Pick<LaunchTarget, 'provider' | 'mode'>): LaunchBlock | null {
  const config = providerConfig(target.provider);
  if (config.underMaintenance) return 'maintenance';
  if (target.mode === 'demo' && !config.supportsDemo) return 'demo-unavailable';
  return null;
}

/** Resolve one launch. `gameId` rides along to the adapter; nothing else reads it. */
export function getLaunchHref(target: LaunchTarget): LaunchResolution {
  const block = launchBlock(target);
  if (block) return { href: LAUNCH_HREF, target: '_self', status: block };

  const launched = adapter?.(target);
  if (launched?.href) {
    return { href: launched.href, target: launched.target ?? '_blank', status: 'ready' };
  }
  return { href: LAUNCH_HREF, target: '_self', status: 'ready' };
}
