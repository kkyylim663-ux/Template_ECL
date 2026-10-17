import { NextResponse } from 'next/server';
import { ticketCodeCatalogue, ticketStore } from '@/lib/mock-tickets/store';

/**
 * MOCK-ONLY: the redemption leg of the ticket centre. The code catalogue and the
 * "this code was already redeemed" state are the mock's (the reference's own
 * redeem request lives in a client chunk that was never captured), so this route
 * owns the server rules: the code must be in the catalogue (`404`), may only be
 * redeemed once (`409`) and must not be past its own expiry (`410`).
 * `idempotencyKey` makes a retried submit hand out one set of tickets.
 */
export async function POST(request: Request) {
  let body: { code?: unknown; idempotencyKey?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return envelope('14', 'Invalid Format', 400);
  }

  const { code, idempotencyKey } = body;
  if (
    typeof code !== 'string' ||
    code.trim().length === 0 ||
    typeof idempotencyKey !== 'string' ||
    idempotencyKey.length === 0
  ) {
    return envelope('14', 'Invalid Format', 400);
  }

  const result = await ticketStore.redeem(
    { code, idempotencyKey },
    { catalogue: ticketCodeCatalogue, now: new Date() },
  );

  if (!result.ok) {
    if (result.code === '404') return envelope('404', 'Code not found', 404);
    if (result.code === '409') return envelope('409', 'Code already redeemed', 409);
    return envelope('410', 'Code expired', 410);
  }

  return NextResponse.json({ status: '0', msg: 'Done', d: result.entry });
}

function envelope(status: string, msg: string, http: number) {
  return NextResponse.json({ status, msg, d: null }, { status: http });
}
