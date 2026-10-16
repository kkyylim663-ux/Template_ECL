import { NextResponse } from 'next/server';
import { getDepositCatalog } from '@/lib/api/deposit';

/**
 * MOCK-ONLY: the bank-transfer leg of the reference's `a/makeBDepositV3`. The
 * failure statuses are the reference dictionary's own codes — 50 "Deposit Bank
 * Error", 52 / 53 "Deposit Amount Less / More Than Bank … Requirement" — and
 * `d` carries the transaction id the receipt step quotes back, plus the mock
 * `token` / `ticketid` its hidden fields expect. No money moves and no balance is
 * credited here.
 */
export async function POST(request: Request) {
  let body: { bankId?: unknown; amountMinor?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return envelope('14', 'Invalid Format', 400);
  }

  const catalog = await getDepositCatalog().catch(() => null);
  const method = catalog?.methods.find((entry) => entry.id === 'bank');
  const bank = catalog?.banks.find((entry) => entry.id === body.bankId);
  if (!catalog || !method) return envelope('1', 'deposit unavailable', 503);
  if (!bank) return envelope('50', 'Deposit Bank Error', 400);

  const amountMinor = body.amountMinor;
  if (typeof amountMinor !== 'number' || !Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    return envelope('14', 'Invalid Format', 400);
  }
  if (amountMinor < method.minAmountMinor) {
    return envelope('52', 'Deposit Amount Less Than Bank Minimum Requirement', 400);
  }
  if (amountMinor > method.maxAmountMinor) {
    return envelope('53', 'Deposit Amount More Than Bank Maximum Requirement', 400);
  }

  const transactionId = `DEP-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296)
    .toString(36)
    .toUpperCase()
    .padStart(2, '0')}`;

  return NextResponse.json({
    status: '0',
    msg: 'Done',
    d: {
      transactionId,
      // The reference's receipt form carried the server's `token` and `ticketid`
      // in hidden fields; these stand in for them (nothing verifies them here).
      token: `MOCK-TOKEN-${transactionId}`,
      ticketid: `MOCK-TICKET-${transactionId}`,
      bankId: bank.id,
      amountMinor,
      createdAt: new Date().toISOString(),
    },
  });
}

function envelope(status: string, msg: string, http: number) {
  return NextResponse.json({ status, msg, d: null }, { status: http });
}
