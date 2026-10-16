// MOCK-ONLY: 提现页数据（已绑定账户 + 银行目录 + 限额 + 证件状态）由 mock 提供（withdrawal.json 与 account 的 bankAccounts/banks/profile）。接后台后换成 getBankAccount + getMyBankAccVerified + settings，调用点不变。
import { callApi } from './client';
import { ENDPOINTS } from './endpoints';
import { withdrawalInfoSchema, type WithdrawalInfo } from './schemas';
import { getAccountPayload } from './account';

/**
 * One round trip for everything `/account/withdrawal` renders: the bound bank
 * accounts with the bank catalog they reference, the per-request limits and the
 * member's document-check state. The mock answers it as one info payload so the
 * panel has a single load to retry.
 */
export async function getWithdrawalInfo(): Promise<WithdrawalInfo> {
  const [{ d }, payload] = await Promise.all([
    callApi<{ limits?: unknown }>(ENDPOINTS.withdrawalInfo),
    getAccountPayload(),
  ]);

  return withdrawalInfoSchema.parse({
    bankAccounts: payload.bankAccounts,
    banks: payload.banks,
    limits: d?.limits,
    kycStatus: payload.profile.kycStatus,
  });
}
