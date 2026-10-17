import { NextResponse } from 'next/server';
import { getWithdrawalInfo } from '@/lib/api/withdrawal';
import { maskAccountNumber } from '@/lib/withdrawal-flow';
import { MAX_WITHDRAWALS_PER_DAY, withdrawalRequestStore } from '@/lib/mock-withdrawal/requests';

/**
 * MOCK-ONLY: the request leg of the reference's `a/makeWithdrawal`. The member's
 * balance is checked and debited in the browser (the wallet is client-side mock
 * state), so this route owns only the server rules: account, limits, pending
 * request, turnover and the daily cap. `idempotencyKey` makes a retried or
 * double-submitted request create one row.
 */

/**
 * Read-only list for the client's settlement step (T59B). Only the fields the
 * history and inbox need: the idempotency key and bank id stay on the server.
 */
export async function GET() {
  const list = await withdrawalRequestStore.list();
  const d = list.map((request) => ({
    id: request.id,
    reference: request.reference,
    amountMinor: request.amountMinor,
    methodLabel: request.methodLabel,
    status: request.status,
    createdAt: request.createdAt,
  }));
  return NextResponse.json({ status: '0', msg: 'Done', d });
}

export async function POST(request: Request) {
  let body: { bankAccountId?: unknown; amountMinor?: unknown; idempotencyKey?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return envelope('14', 'Invalid Format', 400);
  }

  const { bankAccountId, amountMinor, idempotencyKey } = body;
  if (
    typeof bankAccountId !== 'string' ||
    typeof amountMinor !== 'number' ||
    !Number.isSafeInteger(amountMinor) ||
    amountMinor <= 0 ||
    typeof idempotencyKey !== 'string' ||
    idempotencyKey.length === 0
  ) {
    return envelope('14', 'Invalid Format', 400);
  }

  const info = await getWithdrawalInfo().catch(() => null);
  if (!info) return envelope('1', 'withdrawal unavailable', 503);

  const account = info.bankAccounts.find((entry) => entry.id === bankAccountId);
  const bank = account ? info.banks.find((entry) => entry.id === account.bankId) : undefined;
  const methodLabel = account
    ? `${bank?.name ?? account.bankId} ${maskAccountNumber(account.accountNumber)}`
    : '';

  const result = await withdrawalRequestStore.create(
    { bankAccountId, amountMinor, idempotencyKey, methodLabel },
    {
      limits: info.limits,
      verifiedAccountIds: info.bankAccounts.filter((entry) => entry.verified).map((entry) => entry.id),
      turnoverRemainingMinor: info.turnoverRemainingMinor,
      maxPerDay: MAX_WITHDRAWALS_PER_DAY,
      now: new Date(),
    },
  );

  if (!result.ok) {
    const message: Record<typeof result.code, string> = {
      '201': 'Withdrawal Bank Account Error',
      '210': 'Withdrawal Amount Error [MIN]',
      '211': 'Withdrawal Amount Error [MAX]',
      '212': 'You have a withdrawal is pending for approval.',
      '213': 'Remaining turnover must be completed first.',
      '501': 'Withdrawal Rejected [Exceed Daily Limit]',
    };
    return envelope(result.code, message[result.code], 400);
  }

  return NextResponse.json({
    status: '0',
    msg: 'Done',
    d: {
      id: result.request.id,
      reference: result.request.reference,
      amountMinor: result.request.amountMinor,
      methodLabel: result.request.methodLabel,
      createdAt: result.request.createdAt,
      replayed: result.replayed,
    },
  });
}

function envelope(status: string, msg: string, http: number) {
  return NextResponse.json({ status, msg, d: null }, { status: http });
}
