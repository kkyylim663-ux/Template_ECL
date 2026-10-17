import { describe, expect, it } from 'vitest';
import {
  FALLBACK_PROVIDER_CONFIG,
  GAME_PROVIDER_IDS,
  PROVIDER_CONFIG,
  isGameProvider,
  providerConfig,
} from '@/config/providers';
import { getSlotGameList } from '@/lib/api/slots';

describe('provider registry (T62)', () => {
  it("covers the fixture's 28 providers, in fixture order", async () => {
    const list = await getSlotGameList();

    expect(list.g).toHaveLength(28);
    expect(GAME_PROVIDER_IDS).toEqual(list.g);
    expect(new Set(GAME_PROVIDER_IDS).size).toBe(28);
  });

  it('carries all three flags for every listed studio', () => {
    for (const id of GAME_PROVIDER_IDS) {
      const config = providerConfig(id);
      expect(config, id).toBe(PROVIDER_CONFIG[id]);
      expect(config.id, id).toBe(id);
      expect(typeof config.supportsDemo, `${id}.supportsDemo`).toBe('boolean');
      expect(typeof config.requiresLogin, `${id}.requiresLogin`).toBe('boolean');
      expect(typeof config.underMaintenance, `${id}.underMaintenance`).toBe('boolean');
    }
  });

  it('marks one studio under maintenance and one without a Demo action', () => {
    const maintenance = GAME_PROVIDER_IDS.filter((id) => providerConfig(id).underMaintenance);
    const noDemo = GAME_PROVIDER_IDS.filter((id) => !providerConfig(id).supportsDemo);

    expect(maintenance).toEqual(['nextspin']);
    expect(noDemo).toEqual(['aviatrix']);
    // Every studio in the fixture asks a guest to sign in first.
    expect(GAME_PROVIDER_IDS.filter((id) => !providerConfig(id).requiresLogin)).toEqual([]);
  });

  it('answers a studio outside the fixture (the clubs) with the defaults', () => {
    const club = providerConfig('Evolution Asia');

    expect(isGameProvider('Evolution Asia')).toBe(false);
    expect(club).toEqual({ id: 'Evolution Asia', ...FALLBACK_PROVIDER_CONFIG });
    expect(club.underMaintenance).toBe(false);
    expect(club.supportsDemo).toBe(true);
  });
});
