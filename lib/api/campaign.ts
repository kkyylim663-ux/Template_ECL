import { callApi } from './client';
import { ENDPOINTS } from './endpoints';
import {
  LEADERBOARD_KINDS,
  homeBettingSchema,
  leaderboardMapSchema,
  type HomeBetting,
  type Leaderboard,
  type LeaderboardKind,
} from './schemas';

/** The six boards the ranking page switches between, in display order. */
export const BOARD_KINDS = LEADERBOARD_KINDS;

/** Display name lives in `games.ranking.board.<kind>`. */
export function boardLabelKey(kind: LeaderboardKind): string {
  return `ranking.board.${kind}`;
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

/** Home page "Betting Transaction" block: recent stakes + today's top winners. */
export async function getHomeBetting(): Promise<HomeBetting> {
  const { d } = await callApi(ENDPOINTS.homeBetting);
  return homeBettingSchema.parse(d);
}
