import { NextResponse } from 'next/server';
import { getAchievementsInfo } from '@/lib/api/achievements';

/**
 * The achievement page's data (T64): the rungs with the status this build shows
 * and the rewards already claimed. Answers the backend envelope so the client
 * path survives the mock switch.
 */
export async function GET() {
  try {
    return NextResponse.json({ status: '0', msg: 'Done', d: await getAchievementsInfo() });
  } catch {
    return NextResponse.json({ status: '1', msg: 'achievements unavailable', d: null }, { status: 500 });
  }
}
