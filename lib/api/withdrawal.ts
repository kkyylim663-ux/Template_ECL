// MOCK-ONLY: 提现页数据（已绑定账户 + 银行目录 + 限额 + 证件状态）。已绑定账户来自可写库（lib/mock-withdrawal/banks.ts），提现页与 Banking Details 页（/account/banks）读同一份，T57 的增删改立即反映到两页。接后台后换成 getBankAccount + getMyBankAccVerified + settings，调用点不变。
import { callApi } from './client';
import { ENDPOINTS } from './endpoints';
import { withdrawalInfoSchema, type WithdrawalInfo } from './schemas';
import { getAccountPayload } from './account';
import { bankAccountStore } from '@/lib/mock-withdrawal/banks';

/**
 * One round trip for everything the withdrawal and Banking Details pages
 * render: the bound bank accounts with the bank catalog they reference, the
 * per-request limits and the member's document-check state. The mock answers it
 * as one info payload so each panel has a single load to retry.
 */
export async function getWithdrawalInfo(): Promise<WithdrawalInfo> {
  const [{ d }, payload, bankAccounts] = await Promise.all([
    callApi<{ limits?: unknown }>(ENDPOINTS.withdrawalInfo),
    getAccountPayload(),
    bankAccountStore.list(),
  ]);

  const turnoverRemainingMinor = payload.promotionRollover.reduce(
    (sum, row) => sum + Math.max(0, row.requirementMinor - row.progressMinor),
    0,
  );

  return withdrawalInfoSchema.parse({
    bankAccounts,
    banks: payload.banks,
    limits: d?.limits,
    kycStatus: payload.profile.kycStatus,
    turnoverRemainingMinor,
  });
}
