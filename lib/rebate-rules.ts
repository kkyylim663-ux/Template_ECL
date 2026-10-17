// MOCK-ONLY: 返水规则（客户端与服务端共用，不 import 服务端模块）。
// 最低发放额取自原站 Daily Cash Rebate 说明（crawl/pages/my_promotions.html：
// "receive a minimum payout of RM/SGD 5 and complete a one-time rollover"）。

/** The reference's minimum payout: below it a rebate is not paid out yet. */
export const MIN_REBATE_PAYOUT_MINOR = 500;

export type RebateStatus = 'pending' | 'claimable' | 'claimed';

/**
 * The status a rebate row ends up showing. A row is claimed once a claim record
 * exists (or the fixture already said so, which the seeded record mirrors);
 * below the minimum payout it stays pending however the fixture labelled it.
 */
export function resolveRebateStatus({
  seedStatus,
  amountMinor,
  claimed,
  minPayoutMinor = MIN_REBATE_PAYOUT_MINOR,
}: {
  seedStatus: RebateStatus;
  amountMinor: number;
  claimed: boolean;
  minPayoutMinor?: number;
}): RebateStatus {
  if (claimed || seedStatus === 'claimed') return 'claimed';
  if (seedStatus === 'pending' || amountMinor < minPayoutMinor) return 'pending';
  return 'claimable';
}

/** What the selected period can pay out right now. */
export function sumClaimableMinor(rows: { status: RebateStatus; amountMinor: number }[]): number {
  return rows.reduce((sum, row) => (row.status === 'claimable' ? sum + row.amountMinor : sum), 0);
}
