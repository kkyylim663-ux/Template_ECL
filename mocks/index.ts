/**
 * Mock endpoints, keyed by the real endpoint names from docs/API_OBSERVED.md.
 *
 * Every mock file is a captured response envelope (`{ status, msg, d }`), so the
 * registry unwraps `d` and the shape a caller sees is identical to production.
 *
 * SERVER-ONLY: `slots.gamelist.json` is ~650 KB. Importing this module from a
 * client component would ship the whole game list to the browser, so client
 * components must fetch `/api/*` route handlers instead.
 */
import { ENDPOINTS } from '@/lib/api/endpoints';
import announcements from './announcements.json';
import banners from './banners.json';
import promotions from './promotions.json';
import gameList from './slots.gamelist.json';

/** `d` of the captured slots payload. */
export const mockSlotGameList = gameList.d;

export const MOCK_ENDPOINTS: Record<string, () => unknown> = {
  [ENDPOINTS.gameList]: () => gameList.d,
  [ENDPOINTS.homeBanner]: () => banners.d,
  [ENDPOINTS.announcement]: () => announcements.d,
  [ENDPOINTS.displayPromo]: () => promotions.d,
};
