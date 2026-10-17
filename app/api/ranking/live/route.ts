import { NextResponse } from 'next/server';
import { getLeaderboards } from '@/lib/api/campaign';
import { LIVE_BOARD_KIND, MAX_LIVE_STEP, advanceLiveBoard } from '@/lib/ranking-live';

/**
 * MOCK-ONLY: the Current LIVE board one refresh further along (T69). The
 * reference re-renders this board server-side and never polls it, so there is no
 * endpoint to copy — `step` is how many refreshes the caller has already seen,
 * and the board is advanced from `mocks/leaderboards.json` by that many steps.
 * Answers the backend envelope so the client path survives the mock switch.
 */
export async function GET(request: Request) {
  const requested = Number(new URL(request.url).searchParams.get('step') ?? '1');
  const step = Number.isFinite(requested) ? Math.min(Math.max(Math.trunc(requested), 1), MAX_LIVE_STEP) : 1;

  try {
    const boards = await getLeaderboards();
    const board = boards[LIVE_BOARD_KIND];
    if (!board) {
      return NextResponse.json({ status: '1', msg: `no ${LIVE_BOARD_KIND} board`, d: null }, { status: 404 });
    }
    return NextResponse.json({ status: '0', msg: 'Done', d: advanceLiveBoard(board, step) });
  } catch {
    return NextResponse.json({ status: '1', msg: 'leaderboard unavailable', d: null }, { status: 500 });
  }
}
