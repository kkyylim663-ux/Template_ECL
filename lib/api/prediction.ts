// MOCK-ONLY: 预测票的会员列表（T68）——`.mock-data/prediction-bets.json` 里的记录。
// 原站没有抓到这张表（投注单 chunk 未抓到），列表是本 build 的（MOCK_INVENTORY "T68"）。
// 接后台后换成会员预测票接口。
import { predictionStore } from '@/lib/mock-prediction/store';

export type PredictionBetsInfo = {
  bets: {
    id: string;
    picks: {
      fixtureId: string;
      optionId: string;
      label: string;
      odds: number;
      league: string;
      home: string;
      away: string;
    }[];
    amountMinor: number;
    totalMinor: number;
    placedAt: string;
  }[];
};

/** The member's tickets, newest first, without the idempotency keys. */
export async function getPredictionBets(): Promise<PredictionBetsInfo> {
  const snapshot = await predictionStore.read();

  return {
    bets: snapshot.bets.map((entry) => ({
      id: entry.id,
      picks: entry.picks.map((pick) => ({ ...pick })),
      amountMinor: entry.amountMinor,
      totalMinor: entry.totalMinor,
      placedAt: entry.placedAt,
    })),
  };
}
