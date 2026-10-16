import { NextResponse } from 'next/server';
import { z } from 'zod';
import { callApi } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import { getSession } from '@/lib/session/server';

/**
 * T49 password change. Mock mode: the mock keeps the new password in memory for
 * the life of the server, so a later sign-in with it succeeds and a restart
 * falls back to the fixture.
 */
const changeBody = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ status: '1', msg: 'Not signed in', d: null }, { status: 401 });
  }

  const parsed = changeBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: '1', msg: 'Invalid request', d: null }, { status: 400 });
  }

  const { d } = await callApi(ENDPOINTS.changePassword, {
    identifier: session.username,
    ...parsed.data,
  });
  if (!d) {
    return NextResponse.json(
      { status: '1', msg: 'Current password is incorrect', d: null },
      { status: 401 },
    );
  }
  return NextResponse.json({ status: '0', msg: 'Done', d });
}
