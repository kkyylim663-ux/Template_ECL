// MOCK-ONLY: mock 端点注册表：mocks/*.json 的全部假数据（账号、余额、历史、收件箱、榜单、公告、促销…）、演示账号、注册与改密码都在这里挂载。接后台后整目录可删（或保留为离线演示模式）。
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
import { accountStore, type NewAccount } from '@/lib/mock-auth/accounts';
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
import vip from './vip.json';
import gameList from './slots.gamelist.json';

/** `d` of the captured slots payload. */
export const mockSlotGameList = gameList.d;

type Body = { id?: string; slug?: string; topic?: string };

const promotionsData = promotions.d as { id: string; slug: string }[] & unknown[];
const updatesData = updates.d as { id: string }[];
const faqData = faq.d as { id: string; title: string; items: unknown[] }[];
const pagesData = pages.d as { slug: string }[];

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
  [ENDPOINTS.login]: async (raw) => {
    const { identifier, password, otp } = (raw ?? {}) as {
      identifier?: string;
      password?: string;
      otp?: string;
    };
    const user = identifier ? await accountStore.findByIdentifier(identifier) : undefined;
    if (!user) return null;
    const matches = password
      ? await accountStore.verifyPassword(user, password)
      : user.otp === otp;
    return matches ? { sub: user.id, username: user.username } : null;
  },

  /** T49: the current password has to match before the new one replaces it. */
  [ENDPOINTS.changePassword]: async (raw) => {
    const { identifier, currentPassword, newPassword } = (raw ?? {}) as {
      identifier?: string;
      currentPassword?: string;
      newPassword?: string;
    };
    const user = identifier ? await accountStore.findByIdentifier(identifier) : undefined;
    if (!user || !currentPassword) return null;
    if (!(await accountStore.verifyPassword(user, currentPassword))) return null;
    if (typeof newPassword !== 'string' || newPassword.length < 8) return null;
    await accountStore.setPassword(user.id, newPassword);
    return { ok: true };
  },

  /** True when the username, email or mobile is already registered (preset or created). */
  [ENDPOINTS.checkAccount]: async (raw) => {
    const { username, email, phone } = (raw ?? {}) as {
      username?: string;
      email?: string;
      phone?: string;
    };
    return (await accountStore.takenField({ username, email, phone })) !== null;
  },

  /** Creates the account, or answers the field that is already in use. */
  [ENDPOINTS.register]: async (raw) => {
    const result = await accountStore.create(raw as NewAccount);
    if (!result.ok) return { ok: false, field: result.field };
    return {
      ok: true,
      account: {
        sub: result.account.id,
        username: result.account.username,
        walletOpening: result.account.walletOpening,
      },
    };
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
