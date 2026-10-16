// MOCK-ONLY: 注册接口（演示）。验证码固定 123456；账号写入 mock 会员库，成功即签发会话（自动登录）。接后台后改为真实注册接口。
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { callApi } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import { createSession } from '@/lib/session';
import { setSessionCookie } from '@/lib/session/server';
import type { TakenField, WalletOpening } from '@/lib/mock-auth/accounts';

/** Mock email code: the same fixed value the sign-in OTP uses. */
const MOCK_CODE = '123456';

const registerBody = z.object({
  email: z
    .string()
    .trim()
    .max(120)
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/),
  emailOtp: z.string().trim().regex(/^\d{6}$/),
  username: z.string().trim().regex(/^[A-Za-z0-9]{4,20}$/),
  password: z.string().min(8).max(64),
  fullName: z.string().trim().min(2).max(80),
  nickname: z.string().trim().min(2).max(40),
  /** Full international number with the dial code, e.g. "+60123456789". */
  phone: z.string().trim().regex(/^\+[0-9]{7,15}$/),
});

type RegisterResult =
  | { ok: true; account: { sub: string; username: string; walletOpening: WalletOpening } }
  | { ok: false; field: TakenField };

/**
 * Creates the account and signs it in. Duplicate username, email or mobile answers
 * 409 with the field name; a wrong code answers 400 with `field: 'emailOtp'`. The
 * password never leaves this handler.
 */
export async function POST(request: Request) {
  const parsed = registerBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: '1', msg: 'Invalid request', d: null }, { status: 400 });
  }
  const body = parsed.data;
  if (body.emailOtp !== MOCK_CODE) {
    return NextResponse.json(
      { status: '1', msg: 'Wrong code', d: { field: 'emailOtp' } },
      { status: 400 },
    );
  }

  const { d } = await callApi<RegisterResult>(ENDPOINTS.register, {
    username: body.username,
    email: body.email,
    phone: body.phone,
    password: body.password,
    fullName: body.fullName,
    nickname: body.nickname,
    otp: MOCK_CODE,
  });

  if (!d.ok) {
    return NextResponse.json(
      { status: '1', msg: 'Already in use', d: { field: d.field } },
      { status: 409 },
    );
  }

  const { sub, username, walletOpening } = d.account;
  await setSessionCookie(await createSession({ sub, username }));
  return NextResponse.json({ status: '0', msg: 'Done', d: { sub, username, walletOpening } });
}
