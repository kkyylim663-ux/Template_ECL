import { callApi } from './client';
import { ENDPOINTS } from './endpoints';
import { accountPayloadSchema, type AccountPayload } from './schemas';

/**
 * Everything the member area shows, in one round trip. The account pages are
 * placeholders in P0: they render this payload and their forms only validate —
 * nothing is submitted anywhere.
 */
export async function getAccountPayload(): Promise<AccountPayload> {
  const { d } = await callApi(ENDPOINTS.account);
  return accountPayloadSchema.parse(d);
}

export function totalBalanceMinor(payload: AccountPayload): number {
  return payload.wallets.reduce((sum, wallet) => sum + wallet.amountMinor, 0);
}

export function mainWallet(payload: AccountPayload) {
  return payload.wallets.find((wallet) => wallet.kind === 'main') ?? payload.wallets[0] ?? null;
}
