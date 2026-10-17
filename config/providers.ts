/**
 * Studio registry: the 28 providers `mocks/slots.gamelist.json` ships (`d.g`),
 * plus the flags the launch seam needs. `lib/game/launch.ts` resolves every
 * Play Now / Demo link through this table and `lib/game/launch-gate.ts` reads
 * the same flags to decide which notice a click owes the visitor, so the link
 * and the dialog can never disagree.
 *
 * MOCK-ONLY: the reference build keeps no such table on the client. Its card
 * template only drops the Demo action when the game data says
 * `demoPlay == false` (`slot-item-tpl`), and maintenance is decided on the
 * server. The snapshot carries neither, so this file is where this build keeps
 * that decision — see `MOCK_INVENTORY.md` for the two studios marked below.
 * A studio outside the game fixture (the live casino / sports clubs) has no
 * entry and falls back to `FALLBACK_PROVIDER_CONFIG`.
 */
export type ProviderConfig = {
  /** The fixture's provider id, e.g. `pragmatic`. */
  id: string;
  /** The Demo action exists for this studio (the reference's `demoPlay != false`). */
  supportsDemo: boolean;
  /** A signed-in member is required before a real game can start. */
  requiresLogin: boolean;
  /** Studio-wide maintenance: cards wear the tag and every click answers `maintenance_msg`. */
  underMaintenance: boolean;
};

/** The 28 providers of `mocks/slots.gamelist.json`, in fixture order. */
export const GAME_PROVIDER_IDS = [
  'pragmatic',
  'pt',
  'spade',
  'va',
  'joker',
  'w88',
  'cq9',
  'booming',
  'jili',
  'nextspin',
  'fachai',
  'haba',
  'relaxgaming',
  'redtiger',
  'jdb',
  'advantplay',
  'microplus',
  'btg',
  'netent',
  'nolimitcity_new',
  'hacksaw_ig',
  'fastspin',
  'dt',
  'fatpanda',
  'inout',
  'playace',
  'bng',
  'aviatrix',
] as const;

export type GameProviderId = (typeof GAME_PROVIDER_IDS)[number];

type ProviderFlags = Omit<ProviderConfig, 'id'>;

/** What every studio in the fixture offers — the snapshot shows no counter-example. */
const ALL: ProviderFlags = {
  supportsDemo: true,
  requiresLogin: true,
  underMaintenance: false,
};

/** This build's two marked studios (mock data; `MOCK_INVENTORY.md`). */
const NEXTSPIN: ProviderFlags = { ...ALL, underMaintenance: true };
const AVIATRIX: ProviderFlags = { ...ALL, supportsDemo: false };

const FLAGS: Record<GameProviderId, ProviderFlags> = {
  pragmatic: ALL,
  pt: ALL,
  spade: ALL,
  va: ALL,
  joker: ALL,
  w88: ALL,
  cq9: ALL,
  booming: ALL,
  jili: ALL,
  nextspin: NEXTSPIN,
  fachai: ALL,
  haba: ALL,
  relaxgaming: ALL,
  redtiger: ALL,
  jdb: ALL,
  advantplay: ALL,
  microplus: ALL,
  btg: ALL,
  netent: ALL,
  nolimitcity_new: ALL,
  hacksaw_ig: ALL,
  fastspin: ALL,
  dt: ALL,
  fatpanda: ALL,
  inout: ALL,
  playace: ALL,
  bng: ALL,
  aviatrix: AVIATRIX,
};

export const PROVIDER_CONFIG: Record<GameProviderId, ProviderConfig> = Object.fromEntries(
  GAME_PROVIDER_IDS.map((id) => [id, { id, ...FLAGS[id] }]),
) as Record<GameProviderId, ProviderConfig>;

/** Studios the game fixture does not list keep the unmarked defaults. */
export const FALLBACK_PROVIDER_CONFIG: ProviderFlags = ALL;

export function isGameProvider(id: string): id is GameProviderId {
  return Object.prototype.hasOwnProperty.call(PROVIDER_CONFIG, id);
}

/** Flags for any provider id; unknown ids (the clubs) answer with the defaults. */
export function providerConfig(id: string): ProviderConfig {
  return isGameProvider(id) ? PROVIDER_CONFIG[id] : { id, ...FALLBACK_PROVIDER_CONFIG };
}
