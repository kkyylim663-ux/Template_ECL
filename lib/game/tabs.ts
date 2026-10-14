import { titleize } from '@/lib/text';

/**
 * Tab ids differ between providers (`slot`, `slots`, `bbonus`, `progressive`…),
 * so each id maps to a message key under `games.tabs`. Ids we do not know stay
 * as the provider spelled them: that is data, not copy.
 */
const TAB_KEYS: Record<string, string> = {
  top: 'top',
  all: 'all',
  new: 'new',
  slot: 'slot',
  slots: 'slots',
  video: 'video',
  bbonus: 'bbonus',
  progressive: 'progressive',
  table: 'table',
  classic: 'classic',
  scratchcards: 'scratchcards',
  other: 'other',
};

/** Message key inside the `games` namespace, or null for an unknown id. */
export function tabLabelKey(id: string): string | null {
  const key = TAB_KEYS[id];
  return key ? `tabs.${key}` : null;
}

/** Fallback for ids outside the map. */
export function tabFallbackLabel(id: string): string {
  return titleize(id);
}
