/**
 * Backend endpoint names, exactly as the service expects them
 * (see docs/API_OBSERVED.md). `orginalGameList` is misspelled upstream — the
 * typo is part of the contract, so keep it.
 */
export const ENDPOINTS = {
  /** Slots / fast-game list, embedded in the original page as `orginalGameList`. */
  gameList: 'orginalGameList',
  homeBanner: 'getHomeBanner',
  announcement: 'getAnnouncement',
  displayPromo: 'getDisplayPromo',
  webEvent: 'getWebEvent',
  /** Project-specific: one payload for the display-only pages (4D, number game, prediction). */
  displayPage: 'getDisplayPage',
} as const;

export type EndpointName = (typeof ENDPOINTS)[keyof typeof ENDPOINTS];
