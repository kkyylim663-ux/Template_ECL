// MOCK-ONLY: mock-auth 路由，仅演示（会话、演示账号校验、重复用户名检查、改密码覆盖）。接后台后由真实 auth/account 服务替代。
import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/session/server';

export async function POST() {
  await clearSession();
  return NextResponse.json({ status: '0', msg: 'Done', d: null });
}
