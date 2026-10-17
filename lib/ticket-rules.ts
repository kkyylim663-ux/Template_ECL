/**
 * The ticket centre's rules (T65). The reference page states the earning rule in
 * its own copy ("Every MYR500 Deposit = 1 Free Ticket") and hands out a free
 * ticket per MYR 500 of approved deposits; a ticket is valid until the window it
 * came from closes (an event's `closesAt`, a redemption code's own expiry), and
 * entering an event from the "Use Tickets Now" dialog spends one.
 *
 * The reference renders this page from a client chunk that was never captured,
 * so the split into per-ticket rows, the tab set (available / used / expired)
 * and the countdown are this build's — registered in ecl-site/MOCK_INVENTORY.md.
 * Pure functions: the page, the API and the tests share them.
 */

/** The reference's own cap: "Maximum holding limit is 200 tickets per account". */
export const TICKET_CAP = 200;
/** The reference's own earning rule: every MYR 500 of deposits earns one ticket. */
export const TICKETS_PER_DEPOSIT_MINOR = 50_000;

export type TicketStatus = 'available' | 'used' | 'expired';

export const TICKET_TABS = ['available', 'used', 'expired'] as const;
export type TicketTab = (typeof TICKET_TABS)[number];

/** A ticket before its state is resolved (status needs the spend records). */
export type TicketSeed = {
  id: string;
  code: string;
  source: 'event' | 'code';
  name: string;
  description: string;
  eventId: string | null;
  ticketsRequired: number | null;
  issuedAt: string;
  expiresAt: string;
};

export type TicketRow = TicketSeed & {
  status: TicketStatus;
  usedAt: string | null;
  usedEvent: string | null;
};

/**
 * A spend record wins, then the window decides. A ticket whose window ends at
 * exactly `now` is expired; an unreadable window is treated as expired so a
 * malformed row can never be spent.
 */
export function resolveTicketStatus({
  expiresAt,
  spent,
  now,
}: {
  expiresAt: string;
  spent: boolean;
  now: Date;
}): TicketStatus {
  if (spent) return 'used';
  const end = new Date(expiresAt).getTime();
  if (Number.isNaN(end)) return 'expired';
  return end <= now.getTime() ? 'expired' : 'available';
}

export type CountdownParts = {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export function ticketCountdown(expiresAt: string, now: Date): CountdownParts {
  const end = new Date(expiresAt).getTime();
  const totalMs = Number.isNaN(end) ? 0 : Math.max(0, end - now.getTime());
  const totalSeconds = Math.floor(totalMs / 1000);
  return {
    totalMs,
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor(totalSeconds / 3_600) % 24,
    minutes: Math.floor(totalSeconds / 60) % 60,
    seconds: totalSeconds % 60,
  };
}

/** Which of the three countdown strings fits the remaining time. */
export function countdownUnit(parts: CountdownParts): 'days' | 'hours' | 'minutes' {
  if (parts.days > 0) return 'days';
  if (parts.hours > 0) return 'hours';
  return 'minutes';
}

export function ticketsInTab(rows: TicketRow[], tab: TicketTab): TicketRow[] {
  return rows.filter((row) => row.status === tab);
}

export function availableTickets(rows: TicketRow[]): TicketRow[] {
  return ticketsInTab(rows, 'available');
}

/** The ticket a spend takes: the one that expires first. */
export function firstSpendable(rows: TicketRow[]): TicketRow | null {
  return (
    [...availableTickets(rows)].sort(
      (a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime(),
    )[0] ?? null
  );
}

export type TicketEventSeed = {
  id: string;
  name: string;
  description: string;
  opensAt: string;
  closesAt: string;
  ticketsHeld: number;
  ticketsRequired: number;
};

/** One row per ticket the fixture says is held for the event. */
export function mintEventTickets(event: TicketEventSeed): TicketSeed[] {
  return Array.from({ length: Math.max(0, event.ticketsHeld) }, (_, index) => ({
    id: `${event.id}-${index + 1}`,
    code: `${event.id.toUpperCase()}-${String(index + 1).padStart(2, '0')}`,
    source: 'event' as const,
    name: event.name,
    description: event.description,
    eventId: event.id,
    ticketsRequired: event.ticketsRequired,
    issuedAt: event.opensAt,
    expiresAt: event.closesAt,
  }));
}

export type TicketRedemptionSeed = {
  id: string;
  code: string;
  tickets: number;
  expiresAt: string;
  redeemedAt: string;
};

/** One row per ticket a redeemed code handed out; the code owns the expiry. */
export function mintRedeemedTickets(redemption: TicketRedemptionSeed): TicketSeed[] {
  return Array.from({ length: Math.max(0, redemption.tickets) }, (_, index) => ({
    id: `${redemption.id}-${index + 1}`,
    code: `${redemption.code}-${String(index + 1).padStart(2, '0')}`,
    source: 'code' as const,
    name: redemption.code,
    description: '',
    eventId: null,
    ticketsRequired: null,
    issuedAt: redemption.redeemedAt,
    expiresAt: redemption.expiresAt,
  }));
}
