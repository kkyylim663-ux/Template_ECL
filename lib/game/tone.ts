/**
 * Deterministic hue from a stable id, so placeholder artwork varies across a grid
 * but never changes between renders (server and client agree).
 */
export function toneFromString(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 359;
  }
  return hash;
}
