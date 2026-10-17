import { NextResponse } from 'next/server';
import { getAchievementsInfo } from '@/lib/api/achievements';
import { achievementClaimStore } from '@/lib/mock-achievements/claims';

/**
 * MOCK-ONLY: the claim leg of the achievement page's reward payout. The
 * member's balance is credited in the browser (the wallet is client-side mock
 * state), so this route owns only the server rules: the rung must exist, must
 * not have been claimed before, and must be at a status that pays out.
 * `idempotencyKey` makes a retried or double-submitted claim pay out once.
 */
export async function POST(request: Request) {
  let body: { achievementId?: unknown; idempotencyKey?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return envelope('14', 'Invalid Format', 400);
  }

  const { achievementId, idempotencyKey } = body;
  if (
    typeof achievementId !== 'string' ||
    achievementId.length === 0 ||
    typeof idempotencyKey !== 'string' ||
    idempotencyKey.length === 0
  ) {
    return envelope('14', 'Invalid Format', 400);
  }

  // The fixture's own column travels with the request: the store must not pay a
  // rung the fixture never marked claimable, however a client calls it.
  const info = await getAchievementsInfo().catch(() => null);
  if (!info) return envelope('1', 'achievements unavailable', 503);

  const row = info.achievements.find((entry) => entry.id === achievementId);
  if (!row) return envelope('404', 'Achievement not found', 404);

  const result = await achievementClaimStore.claim(
    {
      achievementId: row.id,
      idempotencyKey,
      gameType: row.gameType,
      title: row.title,
      requirementMinor: row.requirementMinor,
      rewardMinor: row.rewardMinor,
    },
    { seedStatus: row.status, now: new Date() },
  );

  if (!result.ok) {
    const message: Record<typeof result.code, string> = {
      '211': 'Achievement Status Error',
      '409': 'This reward has already been claimed.',
    };
    return envelope(result.code, message[result.code], result.code === '409' ? 409 : 400);
  }

  return NextResponse.json({
    status: '0',
    msg: 'Done',
    d: {
      id: result.claim.id,
      achievementId: result.claim.achievementId,
      title: result.claim.title,
      reference: result.claim.reference,
      rewardMinor: result.claim.rewardMinor,
      claimedAt: result.claim.claimedAt,
      replayed: result.replayed,
    },
  });
}

function envelope(status: string, msg: string, http: number) {
  return NextResponse.json({ status, msg, d: null }, { status: http });
}
