/**
 * Mock endpoints, keyed by the real endpoint names from docs/API_OBSERVED.md.
 *
 * Every mock file is a captured response envelope (`{ status, msg, d }`), so the
 * registry unwraps `d` and the shape a caller sees is identical to production.
 * Handlers receive the same request body the live service would: a lookup that
 * cannot find its id answers `null`, which is what makes "unknown id → 404" a
 * one-line check in the page.
 *
 * SERVER-ONLY: `slots.gamelist.json` is ~650 KB. Importing this module from a
 * client component would ship the whole game list to the browser, so client
 * components must fetch `/api/*` route handlers instead.
 */
import { ENDPOINTS } from '@/lib/api/endpoints';
import account from './account.json';
import announcements from './announcements.json';
import banners from './banners.json';
import display from './display.json';
import faq from './faq.json';
import homeBetting from './home-betting.json';
import leaderboards from './leaderboards.json';
import lotteryResults from './lottery-results.json';
import pages from './pages.json';
import promotions from './promotions.json';
import rankingBoard from './ranking-board.json';
import sponsor from './sponsor.json';
import updates from './updates.json';
import users from './users.json';
import vip from './vip.json';
import gameList from './slots.gamelist.json';

/** `d` of the captured slots payload. */
export const mockSlotGameList = gameList.d;

type Body = { id?: string; slug?: string; topic?: string };

const promotionsData = promotions.d as { id: string; slug: string }[] & unknown[];
const updatesData = updates.d as { id: string }[];
const faqData = faq.d as { id: string; title: string; items: unknown[] }[];
const pagesData = pages.d as { slug: string }[];
const usersData = users as {
  id: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  otp: string;
}[];

export const MOCK_ENDPOINTS: Record<string, (body?: unknown) => unknown> = {
  [ENDPOINTS.gameList]: () => gameList.d,
  [ENDPOINTS.homeBanner]: () => banners.d,
  [ENDPOINTS.announcement]: () => announcements.d,
  [ENDPOINTS.displayPromo]: () => promotions.d,
  [ENDPOINTS.displayPage]: () => display.d,
  [ENDPOINTS.lotteryResults]: () => lotteryResults.d,
  [ENDPOINTS.rankingContent]: () => rankingBoard.d,
  [ENDPOINTS.leaderboard]: () => leaderboards.d,
  [ENDPOINTS.homeBetting]: () => homeBetting.d,
  [ENDPOINTS.account]: () => account.d,

  /** Matches the identifier against username, email or phone, then the password or OTP. */
  [ENDPOINTS.login]: (raw) => {
    const { identifier, password, otp } = (raw ?? {}) as {
      identifier?: string;
      password?: string;
      otp?: string;
    };
    const needle = identifier?.trim().toLowerCase();
    const user = usersData.find(
      (entry) =>
        [entry.username, entry.email, entry.phone].some((value) => value.toLowerCase() === needle) &&
        (password ? entry.password === password : entry.otp === otp),
    );
    return user ? { sub: user.id, username: user.username } : null;
  },

  [ENDPOINTS.checkAccount]: (raw) => {
    const { username } = (raw ?? {}) as { username?: string };
    const needle = username?.trim().toLowerCase();
    return usersData.some((entry) => entry.username.toLowerCase() === needle);
  },

  /** Detail endpoints answer with the record, or `null` when the id is unknown. */
  [ENDPOINTS.promotionDetail]: (raw) => {
    const { id } = (raw ?? {}) as Body;
    return promotionsData.find((entry) => entry.id === id || entry.slug === id) ?? null;
  },
  [ENDPOINTS.updateList]: () => updates.d,
  [ENDPOINTS.updateDetail]: (raw) => {
    const { id } = (raw ?? {}) as Body;
    return updatesData.find((entry) => entry.id === id) ?? null;
  },
  [ENDPOINTS.faqTopics]: () =>
    faqData.map((topic) => ({ id: topic.id, title: topic.title, count: topic.items.length })),
  [ENDPOINTS.faqTopic]: (raw) => {
    const { topic } = (raw ?? {}) as Body;
    return faqData.find((entry) => entry.id === topic) ?? null;
  },
  [ENDPOINTS.vipLevels]: () => vip.d,
  [ENDPOINTS.sponsorBlocks]: () => sponsor.d,
  [ENDPOINTS.contentPage]: (raw) => {
    const { slug } = (raw ?? {}) as Body;
    return pagesData.find((entry) => entry.slug === slug) ?? null;
  },
};
