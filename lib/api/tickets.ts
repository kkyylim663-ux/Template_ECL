// MOCK-ONLY: 票券中心的数据（T65）。行 = fixture 每个活动按 ticketsHeld 逐张铸出（有效期取活动
// closesAt 的下线）+ 票券库里的兑换码逐张铸出（有效期取码自己的 expiresAt）；状态 = 使用记录优先，
// 再看窗口是否已过（lib/ticket-rules.ts）。接后台后换成 getTicketList（票券由后台按充值发放），
// 调用点不变。
import { getAccountPayload } from './account';
import { ticketStore } from '@/lib/mock-tickets/store';
import {
  mintEventTickets,
  mintRedeemedTickets,
  resolveTicketStatus,
  type TicketRow,
} from '@/lib/ticket-rules';
import { ticketsInfoSchema, type TicketsInfo } from './schemas';

/**
 * Every ticket this member holds, with the state this build shows. The
 * reference's own rule pays one ticket per MYR 500 of approved deposits and the
 * fixture carries the held counts per event, so the rows are minted from the
 * fixture rather than re-derived from the deposit history.
 */
export async function getTicketsInfo(now = new Date()): Promise<TicketsInfo> {
  const [payload, snapshot] = await Promise.all([getAccountPayload(), ticketStore.read()]);
  const spent = new Map(snapshot.spends.map((entry) => [entry.ticketId, entry]));

  const seeds = [
    ...payload.tickets.flatMap((event) => mintEventTickets(event)),
    ...snapshot.redemptions.flatMap((redemption) => mintRedeemedTickets(redemption)),
  ];

  const tickets: TicketRow[] = seeds.map((seed) => {
    const spend = spent.get(seed.id);
    return {
      ...seed,
      status: resolveTicketStatus({ expiresAt: seed.expiresAt, spent: spend !== undefined, now }),
      usedAt: spend?.spentAt ?? null,
      usedEvent: spend?.eventName ?? null,
    };
  });

  return ticketsInfoSchema.parse({ tickets });
}
