// MOCK-ONLY: mock-auth 路由，仅演示（会话、演示账号校验、重复用户名检查、改密码覆盖）。接后台后由真实 auth/account 服务替代。
import { NextResponse } from 'next/server';
import { getAccountPayload, mainWallet } from '@/lib/api';
import { DEFAULT_REGION, brand } from '@/config/brand';
import { getSession } from '@/lib/session/server';

/**
 * Says whether a member is signed in, plus the header summary numbers. The token
 * itself never leaves the server. Guests get zeros so the body shape never changes.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({
      status: '0',
      msg: 'Done',
      d: { member: false, username: null, balanceMinor: 0, currency: '', unread: 0 },
    });
  }

  const payload = await getAccountPayload();
  return NextResponse.json({
    status: '0',
    msg: 'Done',
    d: {
      member: true,
      username: session.username,
      balanceMinor: mainWallet(payload)?.amountMinor ?? 0,
      currency: brand.regions[DEFAULT_REGION].currency,
      unread: payload.inbox.filter((message) => !message.read).length,
    },
  });
}
