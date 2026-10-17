// MOCK-ONLY: 成就规则（客户端与服务端共用，不 import 服务端模块）。
// 原站成就页是 JS 渲染（页面 chunk 未抓到），所以状态口径按 fixture + 本站规则：
// fixture 的 status 是权威；只有 claimable 的行才可以领，领过之后由可写库决定。

export type AchievementSeedStatus = 'locked' | 'in-progress' | 'claimable' | 'claimed';

/** locked 是 fixture 的种子态，不是可领取态；其余三个才是页面上会出现的状态。 */
export type AchievementStatus = Exclude<AchievementSeedStatus, 'locked'>;

export type AchievementRow = {
  id: string;
  gameType: string;
  title: string;
  requirementMinor: number;
  progressMinor: number;
  rewardMinor: number;
  status: AchievementSeedStatus;
};

/**
 * The status a card ends up showing: a claim makes it claimed, a row whose
 * fixture status is claimable stays claimable, and a `locked` row is the
 * fixture's way of saying "not reached yet" — the reference has no lock UI.
 */
export function resolveAchievementStatus({
  seedStatus,
  claimed,
}: {
  seedStatus: AchievementSeedStatus;
  claimed: boolean;
}): AchievementStatus {
  if (claimed || seedStatus === 'claimed') return 'claimed';
  if (seedStatus === 'claimable') return 'claimable';
  return 'in-progress';
}

/** One rung of the turnover-bonus ladder: a requirement and what it pays. */
export type AchievementTier = {
  id: string;
  requirementMinor: number;
  rewardMinor: number;
  status: AchievementStatus;
};

/** Resolved row: what the server sends the page (`locked` has become `in-progress`). */
export type ResolvedAchievementRow = Omit<AchievementRow, 'status'> & { status: AchievementStatus };

/** The ladder, ascending by requirement, one rung per requirement value. */
export function achievementTiers(rows: ResolvedAchievementRow[]): AchievementTier[] {
  const byRequirement = new Map<number, AchievementTier>();
  for (const row of rows) {
    if (byRequirement.has(row.requirementMinor)) continue;
    byRequirement.set(row.requirementMinor, {
      id: row.id,
      requirementMinor: row.requirementMinor,
      rewardMinor: row.rewardMinor,
      status: row.status,
    });
  }
  return [...byRequirement.values()].sort((a, b) => a.requirementMinor - b.requirementMinor);
}

export type AchievementProgress = {
  /** The product's turnover: the store's per-achievement progress is lifetime, so the product's figure is the largest of them. */
  turnoverMinor: number;
  /** The highest requirement already claimed — the rail runs from here to `targetMinor`. */
  floorMinor: number;
  /** The next rung that pays; null once every rung is claimed. */
  targetMinor: number | null;
  /** targetMinor − floorMinor, or 0 when there is no rung left. */
  spanMinor: number;
  /** turnoverMinor clamped into the rail's span — what the rail draws. */
  progressMinor: number;
  /** What is still missing for the next rung, counted from the claimed rung. */
  remainingMinor: number;
};

/**
 * The rail's numbers for one category. The fixture's progress values disagree
 * with the fixture's own status column (a claimed RM 30 rung carries RM 1,500
 * of progress), so status is never recomputed from progress; the rail runs from
 * the highest claimed rung to the next paying one, and the next-rung gap is
 * counted from the claimed rung, not from the lifetime turnover.
 */
export function achievementProgress(rows: ResolvedAchievementRow[]): AchievementProgress {
  const tiers = achievementTiers(rows);
  const turnoverMinor = rows.reduce((max, row) => Math.max(max, row.progressMinor), 0);
  const claimedRequirements = tiers
    .filter((tier) => tier.status === 'claimed')
    .map((tier) => tier.requirementMinor);
  const floorMinor = claimedRequirements.length > 0 ? Math.max(...claimedRequirements) : 0;
  const target = tiers.find((tier) => tier.requirementMinor > floorMinor) ?? null;
  const targetMinor = target?.requirementMinor ?? null;
  const spanMinor = targetMinor === null ? 0 : targetMinor - floorMinor;
  const progressMinor =
    targetMinor === null || spanMinor === 0
      ? turnoverMinor
      : Math.min(Math.max(turnoverMinor, floorMinor), targetMinor);
  return {
    turnoverMinor,
    floorMinor,
    targetMinor,
    spanMinor,
    progressMinor,
    remainingMinor: spanMinor,
  };
}
