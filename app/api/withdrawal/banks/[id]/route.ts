import { NextResponse } from 'next/server';
import { getWithdrawalInfo } from '@/lib/api/withdrawal';
import { bankAccountStore, type BankAccountDraft } from '@/lib/mock-withdrawal/banks';
import { normalizeAccountNumber } from '@/lib/withdrawal-flow';
import { bankAccountFormSchema, validate } from '@/lib/forms';

/**
 * MOCK-ONLY: edit / set-default (PATCH) and delete (DELETE) for one bound
 * account. PATCH takes any subset of the add form's fields plus `isDefault`, then
 * re-validates the merged record against the same schema the form uses, so an
 * edit can never leave a half-valid account behind. The reference's own page
 * answers deletes with `confirm_delete` + `delete`; dropping the default account
 * hands the badge to the first one left (the store's own rule).
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return envelope('14', 'Invalid Format', 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;

  const list = await bankAccountStore.list();
  const current = list.find((account) => account.id === id);
  if (!current) return envelope('404', 'Bank account not found', 404);

  const draft: BankAccountDraft = {
    bankId: typeof input.bankId === 'string' ? input.bankId : current.bankId,
    accountName: typeof input.accountName === 'string' ? input.accountName : current.accountName,
    accountNumber:
      typeof input.accountNumber === 'string'
        ? normalizeAccountNumber(input.accountNumber)
        : current.accountNumber,
  };
  if (typeof input.bankId !== 'string' && typeof input.accountName !== 'string' && typeof input.accountNumber !== 'string' && input.isDefault !== true) {
    return envelope('14', 'Invalid Format', 400);
  }

  const result = validate(bankAccountFormSchema, draft);
  if (!result.ok) return envelope('14', 'Invalid Format', 400);

  if (result.data.bankId !== current.bankId) {
    const info = await getWithdrawalInfo().catch(() => null);
    if (!info) return envelope('1', 'withdrawal unavailable', 503);
    if (!info.banks.some((bank) => bank.id === result.data.bankId)) {
      return envelope('201', 'Withdrawal Bank Account Error', 400);
    }
  }

  const updated = await bankAccountStore.update(id, {
    ...result.data,
    ...(input.isDefault === true ? { isDefault: true } : {}),
  });
  if (!updated.ok) {
    return updated.reason === 'duplicate'
      ? envelope('205', 'Withdrawal Bank Account Error - Bank Account Has Been Registered', 409)
      : envelope('404', 'Bank account not found', 404);
  }

  return NextResponse.json({ status: '0', msg: 'Done', d: updated.account });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const removed = await bankAccountStore.remove(id);
  if (!removed.ok) return envelope('404', 'Bank account not found', 404);

  return NextResponse.json({
    status: '0',
    msg: 'Done',
    d: { removedId: removed.account.id, defaultId: removed.defaultId },
  });
}

function envelope(status: string, msg: string, http: number) {
  return NextResponse.json({ status, msg, d: null }, { status: http });
}
