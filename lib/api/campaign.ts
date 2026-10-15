import { callApi } from './client';
import { ENDPOINTS } from './endpoints';
import {
  LEADERBOARD_KINDS,
  homeBettingSchema,
  leaderboardMapSchema,
  rankingContentSchema,
  type HomeBetting,
  type Leaderboard,
  type LeaderboardKind,
  type RankingContent,
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

/**
 * Ranking-board chrome that is not part of a board itself: the prize structure,
 * the per-category prize pools and the two rule accordions.
 */
export async function getRankingContent(): Promise<RankingContent> {
  const { d } = await callApi(ENDPOINTS.rankingContent);
  return rankingContentSchema.parse(d);
}
