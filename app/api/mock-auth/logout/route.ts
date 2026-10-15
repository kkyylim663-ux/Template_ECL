import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/session/server';

export async function POST() {
  await clearSession();
  return NextResponse.json({ status: '0', msg: 'Done', d: null });
}
