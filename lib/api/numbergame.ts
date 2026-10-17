// MOCK-ONLY: 数字游戏的会员投注列表（T67）——`.mock-data/numbergame-bets.json` 里的记录。
// 原站没有抓到这张表（页面 chunk 未抓到），列表是本 build 的（MOCK_INVENTORY）。
// 接后台后换成会员投注历史接口。
import { numberGameStore } from '@/lib/mock-numbergame/store';

export type NumberGameBetsInfo = {
  bets: {
    id: string;
    lines: number[][];
    amountMinor: number;
    totalMinor: number;
    placedAt: string;
  }[];
};

/** The member's bets, newest first, without the idempotency keys. */
export async function getNumberGameBets(): Promise<NumberGameBetsInfo> {
  const snapshot = await numberGameStore.read();

  return {
    bets: snapshot.bets.map((entry) => ({
      id: entry.id,
      lines: entry.lines.map((line) => [...line]),
      amountMinor: entry.amountMinor,
      totalMinor: entry.totalMinor,
      placedAt: entry.placedAt,
    })),
  };
}
