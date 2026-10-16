import { NextResponse } from 'next/server';
import { getDepositCatalog } from '@/lib/api/deposit';
import { GATEWAY_ORDER_TTL_SECONDS, orderStore } from '@/lib/mock-deposit/orders';

/**
 * MOCK-ONLY: the gateway leg of the reference's `a/makePDeposit` (POST) and the
 * read the mock gateway window makes (GET). Validation reuses the dictionary's
 * own codes — 52 / 53 "Deposit Amount Less / More Than Bank … Requirement" — and
 * no money moves here; the ruling (and its single `creditedAt`) is T54's
 * resolve route.
 */
export async function POST(request: Request) {
  let body: { amountMinor?: unknown; ttlSeconds?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return envelope('14', 'Invalid Format', 400);
  }

  const catalog = await getDepositCatalog().catch(() => null);
  const method = catalog?.methods.find((entry) => entry.id === 'gateway');
  if (!catalog || !method) return envelope('1', 'deposit unavailable', 503);

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

  // `ttlSeconds` is a mock hook for tests (the e2e reaches the expired state with
  // it); anything else falls back to the store's own 15-minute session.
  const ttl = body.ttlSeconds;
  const ttlSeconds =
    typeof ttl === 'number' && Number.isInteger(ttl) && ttl >= 1 && ttl <= 86400
      ? ttl
      : GATEWAY_ORDER_TTL_SECONDS;

  const order = await orderStore.create({ amountMinor, ttlSeconds });
  return NextResponse.json({ status: '0', msg: 'Done', d: order });
}

/** The order a `?order=` names; 404 answers the page's "empty" state. */
export async function GET(request: Request) {
  const orderId = new URL(request.url).searchParams.get('order');
  if (!orderId) return envelope('14', 'Invalid Format', 400);

  const order = await orderStore.get(orderId);
  if (!order) return envelope('404', 'Deposit order not found', 404);

  return NextResponse.json({ status: '0', msg: 'Done', d: order });
}

function envelope(status: string, msg: string, http: number) {
  return NextResponse.json({ status, msg, d: null }, { status: http });
}
