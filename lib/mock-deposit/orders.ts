// MOCK-ONLY: 网关订单与结果记录的演示库。订单写 .mock-data/deposit-orders.json（目录已 .gitignore），每次调用重读文件——Next 会给路由和页面各建模块图，缓存副本会漏掉另一个图刚写的订单。接后台后整个文件删除：建单与网关回调换成真实接口（T59 的联动在那之后）。
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/** The three rulings the mock gateway can hand down (the reference's `pg_deposit_*` set). */
export type DepositOutcome = 'success' | 'failed' | 'processing';

export type GatewayOrder = {
  orderId: string;
  amountMinor: number;
  createdAt: string;
  expiresAt: string;
  /** The first ruling only; later attempts never overwrite it. */
  outcome?: DepositOutcome;
  outcomeAt?: string;
  /** 1 once a ruling landed. The result page only ever reads it (T54's idempotency line). */
  rulings: number;
  /** Set once, on a `success` ruling — T59 reads it to move the balance; a refresh never replays it. */
  creditedAt?: string;
};

export type ResolveResult =
  | { ok: true; order: GatewayOrder; firstRuling: boolean }
  | { ok: false; reason: 'missing' | 'expired' };

/** The reference's own gateway session length was never captured; 15 minutes is this build's. */
export const GATEWAY_ORDER_TTL_SECONDS = 15 * 60;

export interface OrderStore {
  create(input: { amountMinor: number; ttlSeconds?: number }): Promise<GatewayOrder>;
  get(orderId: string): Promise<GatewayOrder | undefined>;
  resolve(orderId: string, outcome: DepositOutcome): Promise<ResolveResult>;
}

/**
 * `file: null` keeps orders in memory (tests). With a file path they persist
 * across dev-server restarts. Every call re-reads the file — see the header.
 */
export function createOrderStore({
  file,
  now = () => Date.now(),
}: {
  file: string | null;
  now?: () => number;
}): OrderStore {
  let memory: GatewayOrder[] = [];

  async function load(): Promise<GatewayOrder[]> {
    if (!file) return memory;
    try {
      return JSON.parse(await readFile(file, 'utf8')) as GatewayOrder[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }

  async function save(list: GatewayOrder[]): Promise<void> {
    if (!file) {
      memory = list;
      return;
    }
    await mkdir(dirname(file), { recursive: true });
    const tmp = `${file}.${randomBytes(4).toString('hex')}.tmp`;
    await writeFile(tmp, JSON.stringify(list, null, 2), 'utf8');
    await rename(tmp, file);
  }

  return {
    async create({ amountMinor, ttlSeconds = GATEWAY_ORDER_TTL_SECONDS }) {
      const list = await load();
      const startedAt = now();
      const order: GatewayOrder = {
        orderId: `PG-${startedAt.toString(36).toUpperCase()}${randomBytes(1)
          .toString('hex')
          .toUpperCase()}`,
        amountMinor,
        createdAt: new Date(startedAt).toISOString(),
        expiresAt: new Date(startedAt + ttlSeconds * 1000).toISOString(),
        rulings: 0,
      };
      list.push(order);
      // A demo store never archives; keep the last 500 orders so the file cannot grow forever.
      await save(list.slice(-500));
      return order;
    },

    async get(orderId) {
      return (await load()).find((order) => order.orderId === orderId);
    },

    async resolve(orderId, outcome) {
      const list = await load();
      const order = list.find((entry) => entry.orderId === orderId);
      if (!order) return { ok: false, reason: 'missing' };
      if (order.outcome) return { ok: true, order, firstRuling: false };
      if (now() > Date.parse(order.expiresAt)) return { ok: false, reason: 'expired' };

      order.outcome = outcome;
      order.outcomeAt = new Date(now()).toISOString();
      order.rulings = 1;
      if (outcome === 'success') order.creditedAt = order.outcomeAt;
      await save(list);
      return { ok: true, order, firstRuling: true };
    },
  };
}

export const orderStore = createOrderStore({
  file: process.env.MOCK_ORDERS_FILE || join(process.cwd(), '.mock-data', 'deposit-orders.json'),
});
