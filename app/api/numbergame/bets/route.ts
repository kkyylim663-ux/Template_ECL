import { NextResponse } from 'next/server';
import { getNumberGameBets } from '@/lib/api/numbergame';
import { numberGameStore } from '@/lib/mock-numbergame/store';
import { betDraftSchema } from '@/lib/numbergame-rules';

/**
 * MOCK-ONLY: the number game's slip. The reference posts its lines to the backend
 * from a chunk that was never captured; this route owns the same job — accept a
 * slip once (`idempotencyKey`), refuse an incomplete or oversized one
 * (`212`/`213`), refuse a stake outside the window (`210`/`211`) — and answers
 * the row shape the slip writes into history. The credit check stays in the
 * browser (`lib/numbergame-bet.ts`), where this build's wallet lives.
 */
export async function GET() {
  const info = await getNumberGameBets();
  return NextResponse.json({ status: '0', msg: 'Done', d: info });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return envelope('14', 'Invalid Format', 400);
  }

  const parsed = betDraftSchema.safeParse(body);
  if (!parsed.success) return envelope('14', 'Invalid Format', 400);

  const result = await numberGameStore.place(parsed.data, { now: new Date() });
  if (!result.ok) {
    if (result.code === '210') return envelope('210', 'Bet amount below the minimum', 400);
    if (result.code === '211') return envelope('211', 'Bet amount above the maximum', 400);
    if (result.code === '212') return envelope('212', 'Each line needs six numbers', 400);
    return envelope('213', 'Too many lines in one slip', 400);
  }

  return NextResponse.json({ status: '0', msg: 'Done', d: result.entry });
}

function envelope(status: string, msg: string, http: number) {
  return NextResponse.json({ status, msg, d: null }, { status: http });
}
