import { callApi } from './client';
import { ENDPOINTS } from './endpoints';
import {
  LEADERBOARD_KINDS,
  leaderboardMapSchema,
  type Leaderboard,
  type LeaderboardKind,
} from './schemas';

/** The six boards the ranking page switches between, in display order. */
export const BOARD_KINDS = LEADERBOARD_KINDS;

const LABELS: Record<LeaderboardKind, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  supervip: 'Super VIP',
  vip: 'VIP',
  live: 'Current LIVE',
  lastweek: 'Last week',
};

export function boardLabel(kind: LeaderboardKind): string {
  return LABELS[kind];
}

export function isBoardKind(value: string): value is LeaderboardKind {
  return (BOARD_KINDS as readonly string[]).includes(value);
}

export async function getLeaderboards(): Promise<Record<string, Leaderboard>> {
  const { d } = await callApi(ENDPOINTS.leaderboard);
  return leaderboardMapSchema.parse(d);
}

export async function getLeaderboard(kind: string): Promise<Leaderboard | null> {
  const boards = await getLeaderboards();
  return boards[kind] ?? null;
}
