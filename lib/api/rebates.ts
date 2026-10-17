// MOCK-ONLY: 返水页数据。行来自账户 payload（mocks/account.json d.rebates），
// 领取状态与领取记录来自可写库 lib/mock-rebates/claims.ts（seed 镜像 fixture 的 rb-3）。
// 接后台后换成 getRebateList + a/claimRebate，调用点不变。
import { getAccountPayload } from './account';
import { rebateClaimStore } from '@/lib/mock-rebates/claims';
import { MIN_REBATE_PAYOUT_MINOR, resolveRebateStatus } from '@/lib/rebate-rules';
import { rebatesInfoSchema, type RebatesInfo } from './schemas';

/**
 * One round trip for the rebates page: the settlement periods the fixture has
 * rows for (newest first), each row's product/turnover/rate/amount with the
 * status this build can pay, and the claims already made.
 */
export async function getRebatesInfo(): Promise<RebatesInfo> {
  const [payload, claims] = await Promise.all([getAccountPayload(), rebateClaimStore.list()]);
  const claimedIds = new Set(claims.map((claim) => claim.rebateId));

  const rows = payload.rebates.map((rebate) => ({
    ...rebate,
    status: resolveRebateStatus({
      seedStatus: rebate.status,
      amountMinor: rebate.amountMinor,
      claimed: claimedIds.has(rebate.id),
    }),
  }));

  const periods = [...new Set(rows.map((row) => row.period))].sort((a, b) => b.localeCompare(a));

  return rebatesInfoSchema.parse({
    minPayoutMinor: MIN_REBATE_PAYOUT_MINOR,
    periods,
    rows,
    // The idempotency key stays on the server, like the withdrawal list's.
    claims: claims.map(({ idempotencyKey: _key, ...claim }) => claim),
  });
}
