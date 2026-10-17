// MOCK-ONLY: 成就页数据。行来自账户 payload（mocks/account.json d.achievements），
// 领取状态与领取记录来自可写库 lib/mock-achievements/claims.ts。行里的 status 是解析后的展示态
// （`locked` 种子态变成 `in-progress`），领取记录优先。接后台后换成 getAchievementList + a/claimAchievement，
// 调用点不变。
import { getAccountPayload } from './account';
import { achievementClaimStore } from '@/lib/mock-achievements/claims';
import { resolveAchievementStatus } from '@/lib/achievement-rules';
import { achievementsInfoSchema, type AchievementsInfo } from './schemas';

/**
 * One round trip for the achievement page: every fixture rung with the status
 * this build shows, and the rewards already claimed. The reference renders this
 * page from a client chunk that was never captured, so the status rule is ours
 * (a claim record wins over the fixture's column) — see lib/achievement-rules.ts.
 */
export async function getAchievementsInfo(): Promise<AchievementsInfo> {
  const [payload, claims] = await Promise.all([getAccountPayload(), achievementClaimStore.list()]);
  const claimedIds = new Set(claims.map((claim) => claim.achievementId));

  const achievements = payload.achievements.map((achievement) => ({
    ...achievement,
    status: resolveAchievementStatus({
      seedStatus: achievement.status,
      claimed: claimedIds.has(achievement.id),
    }),
  }));

  return achievementsInfoSchema.parse({
    achievements,
    // The idempotency key stays on the server, like the rebates list's.
    claims: claims.map(({ idempotencyKey: _key, ...claim }) => claim),
  });
}
