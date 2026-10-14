import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_PAGE_SIZE, getSlotGameList, queryGames } from '@/lib/api';

/**
 * One page of the slots grid. Answers with the same envelope as the backend
 * (`{ status, msg, d }`), so the client code path is identical once
 * NEXT_PUBLIC_USE_MOCK=0 points at the real service.
 *
 * The full game list lives on the server only; the browser asks for 24 at a time.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const provider = params.get('provider') ?? '';
  const list = await getSlotGameList();

  if (!list.g.includes(provider)) {
    return NextResponse.json(
      { status: '1', msg: `unknown provider "${provider}"`, d: null },
      { status: 400 },
    );
  }

  const pageSize = Number(params.get('pageSize')) || DEFAULT_PAGE_SIZE;
  const page = Number(params.get('page')) || 1;

  const result = queryGames(list, {
    provider,
    tab: params.get('tab') ?? undefined,
    q: params.get('q') ?? undefined,
    page: Math.max(1, page),
    pageSize: Math.min(60, Math.max(1, pageSize)),
  });

  return NextResponse.json({ status: '0', msg: 'Done', d: result });
}
