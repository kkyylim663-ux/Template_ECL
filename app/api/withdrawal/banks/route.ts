import { NextResponse } from 'next/server';
import { getWithdrawalInfo } from '@/lib/api/withdrawal';
import { bankAccountStore } from '@/lib/mock-withdrawal/banks';
import { MAX_BOUND_ACCOUNTS, normalizeAccountNumber } from '@/lib/withdrawal-flow';
import { bankAccountFormSchema, validate } from '@/lib/forms';

/**
 * MOCK-ONLY: the add-bank leg of the reference's banking-detail page (its old
 * build posts `a/setBankAccount`; the dictionary carries `add_bank_acc` and
 * `bank_acc_success`). The form schema runs again here — the number is
 * normalised first, exactly as the form does while typing, so a caller may post
 * the spaced form the old build sent — the bank has to exist in the catalog the
 * page renders, and the store owns the reference's own error 205 ("Bank Account
 * Has Been Registered") plus this build's cap. Nothing verifies the account — a
 * new one lands as Pending, like the reference's `bank_pending` status; the
 * receipt check is not part of P4.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return envelope('14', 'Invalid Format', 400);
  }

  const input = (body ?? {}) as Record<string, unknown>;
  const result = validate(bankAccountFormSchema, {
    bankId: typeof input.bankId === 'string' ? input.bankId : '',
    accountName: typeof input.accountName === 'string' ? input.accountName : '',
    accountNumber: normalizeAccountNumber(
      typeof input.accountNumber === 'string' ? input.accountNumber : '',
    ),
  });
  if (!result.ok) return envelope('14', 'Invalid Format', 400);

  const info = await getWithdrawalInfo().catch(() => null);
  if (!info) return envelope('1', 'withdrawal unavailable', 503);
  if (!info.banks.some((bank) => bank.id === result.data.bankId)) {
    return envelope('201', 'Withdrawal Bank Account Error', 400);
  }

  const created = await bankAccountStore.create(result.data);
  if (!created.ok) {
    return created.reason === 'duplicate'
      ? envelope('205', 'Withdrawal Bank Account Error - Bank Account Has Been Registered', 409)
      : envelope('207', `You can bind up to ${MAX_BOUND_ACCOUNTS} bank accounts`, 409);
  }

  return NextResponse.json({ status: '0', msg: 'Done', d: created.account });
}

function envelope(status: string, msg: string, http: number) {
  return NextResponse.json({ status, msg, d: null }, { status: http });
}
