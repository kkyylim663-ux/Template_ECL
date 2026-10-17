import { afterEach, describe, expect, it } from 'vitest';
import { LAUNCH_HREF, getLaunchAdapter, getLaunchHref, setLaunchAdapter } from '@/lib/game/launch';

const game = { provider: 'pragmatic', gameId: '1301', mode: 'real' } as const;

const READY = { href: LAUNCH_HREF, target: '_self', status: 'ready' } as const;

// The adapter is module state; every test leaves it as it found it.
afterEach(() => setLaunchAdapter(null));

describe('the launch seam (T62)', () => {
  it('answers `#` with no launcher wired', () => {
    expect(getLaunchAdapter()).toBeNull();
    expect(getLaunchHref(game)).toEqual(READY);
  });

  it("blocks a studio under maintenance before any launcher is asked", () => {
    setLaunchAdapter(() => ({ href: 'https://launch.example/nextspin/1' }));

    expect(getLaunchHref({ provider: 'nextspin', gameId: '1', mode: 'real' })).toEqual({
      href: LAUNCH_HREF,
      target: '_self',
      status: 'maintenance',
    });
  });

  it('guards a Demo click on a studio without a Demo action', () => {
    expect(getLaunchHref({ provider: 'aviatrix', gameId: '1', mode: 'demo' }).status).toBe(
      'demo-unavailable',
    );
    // Only the Demo action is blocked; the registry does not stand in the way
    // of that studio's real play.
    expect(getLaunchHref({ provider: 'aviatrix', gameId: '1', mode: 'real' })).toEqual(READY);
  });

  it('hands the adapter address through when a launcher is installed', () => {
    setLaunchAdapter((target) => ({
      href: `https://launch.example/${target.provider}/${target.gameId}`,
      target: '_self',
    }));

    expect(getLaunchHref(game)).toEqual({
      href: 'https://launch.example/pragmatic/1301',
      target: '_self',
      status: 'ready',
    });
  });

  it('falls back to `#` when the launcher cannot serve the game', () => {
    setLaunchAdapter(() => null);

    expect(getLaunchHref(game)).toEqual(READY);
  });
});
