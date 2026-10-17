import { NextResponse } from 'next/server';
import { getDisplayPayload } from '@/lib/api';
import { getPredictionBets } from '@/lib/api/prediction';
import { predictionStore } from '@/lib/mock-prediction/store';
import { predictionBetSchema } from '@/lib/prediction-rules';

/**
 * MOCK-ONLY: the prediction slip. The reference posts its picks to the backend
 * from a chunk that was never captured; this route owns the same job — accept a
 * slip once (`idempotencyKey`), then answer with the ticket the slip writes into
 * history. The store holds the rules and their codes: no pick (`212`), too many
 * picks (`213`), a stake outside the window (`210`/`211`), a fixture that is gone
 * (`214`) or closed (`215`), an outcome that is not on it (`216`). The credit
 * check stays in the browser (`lib/prediction-bet.ts`), where this build's wallet
 * lives.
 */
export async function GET() {
  const info = await getPredictionBets();
  return NextResponse.json({ status: '0', msg: 'Done', d: info });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return envelope('14', 'Invalid Format', 400);
  }

  const parsed = predictionBetSchema.safeParse(body);
  if (!parsed.success) return envelope('14', 'Invalid Format', 400);

  const { prediction } = await getDisplayPayload();
  const result = await predictionStore.place(parsed.data, {
    now: new Date(),
    fixtures: prediction,
  });
  if (!result.ok) {
    if (result.code === '210') return envelope('210', 'Bet amount below the minimum', 400);
    if (result.code === '211') return envelope('211', 'Bet amount above the maximum', 400);
    if (result.code === '212') return envelope('212', 'Pick at least one outcome', 400);
    if (result.code === '213') return envelope('213', 'Too many picks in one slip', 400);
    if (result.code === '214') return envelope('214', 'Unknown fixture', 400);
    if (result.code === '215') return envelope('215', 'This fixture has ended', 400);
    return envelope('216', 'Unknown outcome', 400);
  }

  return NextResponse.json({ status: '0', msg: 'Done', d: result.entry });
}

function envelope(status: string, msg: string, http: number) {
  return NextResponse.json({ status, msg, d: null }, { status: http });
}
