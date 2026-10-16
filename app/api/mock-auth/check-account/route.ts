// MOCK-ONLY: mock-auth 路由，仅演示（会话、演示账号校验、重复用户名检查、改密码覆盖）。接后台后由真实 auth/account 服务替代。
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { callApi } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';

const checkBody = z.object({ username: z.string().trim().min(1).max(20) });

/** Registration duplicate check. Only the taken flag leaves the server. */
export async function POST(request: Request) {
  const parsed = checkBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: '1', msg: 'Invalid request', d: null }, { status: 400 });
  }

  const { d } = await callApi<boolean>(ENDPOINTS.checkAccount, parsed.data);
  return NextResponse.json({ status: '0', msg: 'Done', d: { taken: d === true } });
}
