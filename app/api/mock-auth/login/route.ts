import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticate } from '@/lib/api/auth';
import { createSession } from '@/lib/session';
import { setSessionCookie } from '@/lib/session/server';

const loginBody = z
  .object({
    identifier: z.string().trim().min(1).max(120),
    password: z.string().max(200).optional(),
    otp: z.string().max(12).optional(),
  })
  .refine((body) => body.password || body.otp, { message: 'credential required' });

export async function POST(request: Request) {
  const parsed = loginBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: '1', msg: 'Invalid request', d: null }, { status: 400 });
  }

  const user = await authenticate(parsed.data);
  if (!user) {
    return NextResponse.json(
      { status: '1', msg: 'Incorrect account or password', d: null },
      { status: 401 },
    );
  }

  await setSessionCookie(await createSession(user));
  return NextResponse.json({ status: '0', msg: 'Done', d: { username: user.username } });
}
