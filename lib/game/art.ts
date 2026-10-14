/**
 * Artwork URLs. The provider folder layout comes from the reference build's card
 * template; the base host is configuration, and P0 leaves it empty on purpose so
 * the build fetches no external image at all (players see gradient placeholders).
 */
const IMG_BASE = (process.env.NEXT_PUBLIC_IMG_BASE ?? '').replace(/\/+$/, '');

export const IMAGES_ENABLED = IMG_BASE.length > 0;

export function artUrl(provider: string, img: string): string | null {
  if (!IMG_BASE) return null;
  // `img` may already carry a cache-busting query (e.g. `x.png?v2`).
  return `${IMG_BASE}/${provider}/${img}`;
}
