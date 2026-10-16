import walletSeed from '@/mocks/wallet.json';
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
  const payload = accountPayloadSchema.parse(d);
  // MOCK-ONLY: wallets come from the one seed the wallet service uses, so the
  // server fallback (session route, first paint) can never disagree with the
  // client-side balances. A real backend returns the wallets itself.
  const tones = new Map(payload.wallets.map((wallet) => [wallet.code, wallet.tone]));
  return {
    ...payload,
    wallets: walletSeed.wallets.map((wallet) => ({
      ...wallet,
      kind: wallet.kind as 'main' | 'game',
      tone: tones.get(wallet.code) ?? 200,
    })),
  };
}

export function totalBalanceMinor(payload: AccountPayload): number {
  return payload.wallets.reduce((sum, wallet) => sum + wallet.amountMinor, 0);
}

export function mainWallet(payload: AccountPayload) {
  return payload.wallets.find((wallet) => wallet.kind === 'main') ?? payload.wallets[0] ?? null;
}
