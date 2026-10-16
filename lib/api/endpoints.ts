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
  /** Project-specific: 4D payout tables and the seven lottery result books. */
  lotteryResults: 'getLotteryResults',
  /** Project-specific: ranking-board prize structure and the two rule accordions. */
  rankingContent: 'getRankingContent',
  /** Content pages. Project-specific names; P2 maps them onto the live service. */
  promotionDetail: 'getPromotionDetail',
  updateList: 'getUpdateList',
  updateDetail: 'getUpdateDetail',
  faqTopics: 'getFaqTopics',
  faqTopic: 'getFaqTopic',
  vipLevels: 'getVipLevels',
  sponsorBlocks: 'getSponsorBlocks',
  contentPage: 'getContentPage',
  /** Ranking boards. The reference build streams this (`ssoTournament`); P0 snapshots it. */
  leaderboard: 'getLeaderboard',
  /** Home page betting block: recent stakes + top daily winners. */
  homeBetting: 'getHomeBetting',
  /** Member area payload (profile, wallets, transactions, inbox, rebates, tickets). */
  account: 'getAccount',
  /** Member sign-in. Returns `{ sub, username }` for a match, `null` otherwise. */
  login: 'postLogin',
  /** Registration duplicate check. Answers `true` when the username, email or mobile is already taken. */
  checkAccount: 'checkAccExisting',
  /** Registration. Answers the new account, or the field that is already in use. */
  register: 'postRegister',
  /** Profile password change (T49). Mock only: the override lives in memory. */
  changePassword: 'setPassword',
  /** Deposit method limits/fees (P4). The live service folds these into getBanks/settings. */
  depositMethods: 'getDepositMethods',
} as const;

export type EndpointName = (typeof ENDPOINTS)[keyof typeof ENDPOINTS];
