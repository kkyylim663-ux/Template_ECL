// MOCK-ONLY: 成就奖励领取的客户端一半——把服务端记下的领取落到 mock 钱包与历史记录。
// 入账幂等键 = `ach:<achievementId>`，与 walletService 的幂等表配合；localStorage 标记挡住重放。
// 客户端安全：不 import 服务端模块。

import type { HistoryRow } from '@/lib/api/schemas';
import { announceRecords, readRecordList } from '@/lib/mock-records';

/** The claim the server answered with (idempotent replay included). */
export interface ClaimedAchievement {
  id: string;
  achievementId: string;
  title: string;
  reference: string;
  rewardMinor: number;
  claimedAt: string;
}

export interface AchievementLabels {
  /** The history row's `promoType`, e.g. "Achievement reward · Table regular". */
  promoType: string;
}

export interface AchievementRecord {
  achievementId: string;
  row: HistoryRow;
}

const CREDITED_KEY = 'brand:achievement-credited';
const RECORDS_KEY = 'brand:achievement-records';

export const achievementCreditKey = (achievementId: string) => `ach:${achievementId}`;

export function readAchievementRecords(): AchievementRecord[] {
  return readRecordList(RECORDS_KEY).filter(
    (item): item is AchievementRecord =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as AchievementRecord).achievementId === 'string',
  );
}

/**
 * Credits an achievement reward once. Returns the new record, or null when the
 * rung was already credited here (refresh, second tab, replayed POST) — the
 * balance never moves twice. The service's claim state is the server's; this
 * only moves the mock wallet and mirrors the row into history.
 */
export function creditAchievement(
  claim: ClaimedAchievement,
  options: {
    labels: AchievementLabels;
    credit: (amountMinor: number, idempotencyKey: string) => Promise<unknown>;
  },
): Promise<AchievementRecord | null> {
  if (readRecordList(CREDITED_KEY).includes(claim.achievementId)) return Promise.resolve(null);
  return options.credit(claim.rewardMinor, achievementCreditKey(claim.achievementId)).then(() => {
    const record: AchievementRecord = {
      achievementId: claim.achievementId,
      row: {
        id: claim.id,
        kind: 'promo',
        at: claim.claimedAt,
        amountMinor: claim.rewardMinor,
        promoType: options.labels.promoType,
        status: 'approved',
        reason: '',
      },
    };
    try {
      window.localStorage.setItem(
        CREDITED_KEY,
        JSON.stringify([...readRecordList(CREDITED_KEY), claim.achievementId]),
      );
      window.localStorage.setItem(RECORDS_KEY, JSON.stringify([record, ...readAchievementRecords()]));
    } catch {
      // Private mode: the balance moved; the record just does not survive a reload.
    }
    announceRecords();
    return record;
  });
}
