// MOCK-ONLY: 充值目录（方式限额/手续费 + 收款行 + 渠道）由 mock 提供（deposit-methods.json 与 account 的 banks/channels）。接后台后换成 getDepositMethods + getBanks(btype 0/1)，调用点不变。
import { callApi } from './client';
import { ENDPOINTS } from './endpoints';
import {
  depositCatalogSchema,
  isDepositMethodId,
  type DepositCatalog,
  type DepositMethodId,
} from './schemas';
import { getAccountPayload } from './account';

/**
 * One round trip for everything `/account/deposit` renders: the method tabs
 * with their limits and fees, plus the receiving banks and the pay-in
 * channels. The reference splits this across `getBanks(btype 0/1)` and its
 * settings payload; the mock answers it as one catalog so the panel has a
 * single load to retry.
 */
export async function getDepositCatalog(): Promise<DepositCatalog> {
  const [{ d }, payload] = await Promise.all([
    callApi<{ methods?: unknown }>(ENDPOINTS.depositMethods),
    getAccountPayload(),
  ]);

  return depositCatalogSchema.parse({
    methods: d?.methods,
    banks: payload.banks,
    channels: payload.channels,
  });
}

/** `?method=` accepts only the three ids; anything else falls back to `bank`. */
export function resolveMethodId(value: string | string[] | undefined): DepositMethodId {
  const raw = Array.isArray(value) ? value[0] : value;
  return isDepositMethodId(raw) ? raw : 'bank';
}
