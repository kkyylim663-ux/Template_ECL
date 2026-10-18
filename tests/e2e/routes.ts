/** Every route the P0 build is expected to answer, grouped by kind. */
export const REGIONS = ['my', 'sg'] as const;

export const GAME_CATEGORIES = [
  'slots',
  'livecasino',
  'sports',
  'esports',
  'fast-game',
  '4d',
] as const;

export const PUBLIC_STATIC = [
  /** T74's offline fallback page. */
  'offline',
  'promotion',
  'update',
  'ranking-board',
  'vip',
  'numbergame',
  'prediction',
  'sponsor',
  'about',
  'contact',
  'tnc',
  'betting-rules',
  /** T81's two mock chat rooms. */
  'chat',
  'livechat',
] as const;

export const FAQ_TOPICS = [
  'gettingstart',
  'finance',
  'statement',
  'games',
  'events',
  'promotions',
  'contactus',
  'downloadapp',
] as const;

export const AUTH_PAGES = ['login', 'register', 'forgot-password'] as const;

export const ACCOUNT_PAGES = [
  'deposit',
  'withdrawal',
  'transfer',
  'history',
  'pending',
  'inbox',
  'rebates',
  'achievement',
  'tickets',
  'profile',
  /** T81's wallet page (the dock's Wallet entry). */
  'wallet',
  /** T54's deposit sub-pages. */
  'deposit/gateway',
  'deposit/result',
  /** T57's Banking Details page (the reference's `/my/mybanks`). */
  'banks',
] as const;

/** Routes that must answer 200 without a session. */
export function publicRoutes(): string[] {
  const routes: string[] = [];
  for (const region of REGIONS) {
    routes.push(`/${region}`);
    for (const category of GAME_CATEGORIES) routes.push(`/${region}/${category}`);
    for (const page of PUBLIC_STATIC) routes.push(`/${region}/${page}`);
    routes.push(`/${region}/promotion/pr-welcome-188`, `/${region}/update/up-061`);
    for (const topic of FAQ_TOPICS) routes.push(`/${region}/faq/${topic}`);
    for (const page of AUTH_PAGES) routes.push(`/${region}/${page}`);
  }
  return routes;
}

export function accountRoutes(): string[] {
  return REGIONS.flatMap((region) => ACCOUNT_PAGES.map((page) => `/${region}/account/${page}`));
}
