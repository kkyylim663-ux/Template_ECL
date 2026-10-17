import { describe, expect, it } from 'vitest';
import {
  availableTickets,
  countdownUnit,
  firstSpendable,
  mintEventTickets,
  mintRedeemedTickets,
  resolveTicketStatus,
  ticketCountdown,
  ticketsInTab,
  type TicketRow,
} from '@/lib/ticket-rules';

/**
 * T65's contract: the ticket centre's own rules. The reference states the
 * earning rule and the cap in its copy ("Every MYR500 Deposit = 1 Free Ticket",
 * "Maximum holding limit is 200 tickets per account") but renders the page from
 * a chunk that was never captured, so the per-ticket rows, the status split and
 * the countdown are this build's. The e2e covers the page itself.
 */
const at = new Date('2026-10-17T14:00:00+08:00');

const seed = (over: Partial<TicketRow> = {}): TicketRow => ({
  id: 'tk-1-1',
  code: 'TK-1-01',
  source: 'event',
  name: 'Euro Mini Winner draw',
  description: '',
  eventId: 'tk-1',
  ticketsRequired: 1,
  issuedAt: '2026-10-12T00:00:00+08:00',
  expiresAt: '2026-10-18T23:59:00+08:00',
  status: 'available',
  usedAt: null,
  usedEvent: null,
  ...over,
});

describe('resolveTicketStatus', () => {
  it('is available while the window is open', () => {
    expect(resolveTicketStatus({ expiresAt: '2026-10-18T23:59:00+08:00', spent: false, now: at })).toBe('available');
  });

  it('is used as soon as a spend record exists, whatever the window', () => {
    expect(resolveTicketStatus({ expiresAt: '2026-10-01T00:00:00+08:00', spent: true, now: at })).toBe('used');
  });

  it('is expired at the closing second and after it', () => {
    expect(resolveTicketStatus({ expiresAt: '2026-10-17T14:00:00+08:00', spent: false, now: at })).toBe('expired');
    expect(resolveTicketStatus({ expiresAt: '2026-09-30T23:59:00+08:00', spent: false, now: at })).toBe('expired');
  });

  it('never lets an unreadable window be spendable', () => {
    expect(resolveTicketStatus({ expiresAt: 'not-a-date', spent: false, now: at })).toBe('expired');
  });
});

describe('ticketCountdown', () => {
  it('splits the remainder into days, hours, minutes and seconds', () => {
    const parts = ticketCountdown('2026-10-19T15:03:04+08:00', at);
    expect(parts).toEqual({ totalMs: 176_584_000, days: 2, hours: 1, minutes: 3, seconds: 4 });
  });

  it('clamps an elapsed window to zero', () => {
    expect(ticketCountdown('2026-10-01T00:00:00+08:00', at)).toEqual({
      totalMs: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });

  it('picks the string that fits the remainder', () => {
    expect(countdownUnit(ticketCountdown('2026-10-19T15:00:00+08:00', at))).toBe('days');
    expect(countdownUnit(ticketCountdown('2026-10-17T16:30:00+08:00', at))).toBe('hours');
    expect(countdownUnit(ticketCountdown('2026-10-17T14:05:00+08:00', at))).toBe('minutes');
    expect(countdownUnit(ticketCountdown('2026-10-01T00:00:00+08:00', at))).toBe('minutes');
  });
});

describe('mintEventTickets', () => {
  it('draws one row per ticket the fixture holds, on the event window', () => {
    const rows = mintEventTickets({
      id: 'tk-1',
      name: 'Euro Mini Winner draw',
      description: 'Use one ticket to enter this week’s draw.',
      opensAt: '2026-10-12T00:00:00+08:00',
      closesAt: '2026-10-18T23:59:00+08:00',
      ticketsHeld: 3,
      ticketsRequired: 1,
    });

    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.id)).toEqual(['tk-1-1', 'tk-1-2', 'tk-1-3']);
    expect(rows.map((row) => row.code)).toEqual(['TK-1-01', 'TK-1-02', 'TK-1-03']);
    expect(rows[0]).toMatchObject({
      source: 'event',
      eventId: 'tk-1',
      ticketsRequired: 1,
      issuedAt: '2026-10-12T00:00:00+08:00',
      expiresAt: '2026-10-18T23:59:00+08:00',
      name: 'Euro Mini Winner draw',
    });
  });

  it('draws nothing for an event that holds none', () => {
    expect(
      mintEventTickets({
        id: 'tk-3',
        name: '4D bonus draw',
        description: '',
        opensAt: '2026-10-01T00:00:00+08:00',
        closesAt: '2026-10-08T23:59:00+08:00',
        ticketsHeld: 0,
        ticketsRequired: 3,
      }),
    ).toEqual([]);
  });
});

describe('mintRedeemedTickets', () => {
  it('draws one row per ticket the code handed out, on the code’s own expiry', () => {
    const rows = mintRedeemedTickets({
      id: 'tr_abc123',
      code: 'FIVETICKETS',
      tickets: 5,
      expiresAt: '2026-11-30T23:59:00+08:00',
      redeemedAt: '2026-10-17T06:00:00.000Z',
    });

    expect(rows).toHaveLength(5);
    expect(rows[4]).toMatchObject({
      id: 'tr_abc123-5',
      code: 'FIVETICKETS-05',
      source: 'code',
      eventId: null,
      ticketsRequired: null,
      expiresAt: '2026-11-30T23:59:00+08:00',
      issuedAt: '2026-10-17T06:00:00.000Z',
    });
  });
});

describe('the tabs and the spend order', () => {
  const rows: TicketRow[] = [
    seed({ id: 'a', status: 'available', expiresAt: '2026-10-20T00:00:00+08:00' }),
    seed({ id: 'b', status: 'expired', expiresAt: '2026-10-01T00:00:00+08:00' }),
    seed({ id: 'c', status: 'used', expiresAt: '2026-10-18T00:00:00+08:00' }),
    seed({ id: 'd', status: 'available', expiresAt: '2026-10-18T12:00:00+08:00' }),
  ];

  it('splits the rows by state', () => {
    expect(ticketsInTab(rows, 'available').map((row) => row.id)).toEqual(['a', 'd']);
    expect(ticketsInTab(rows, 'used').map((row) => row.id)).toEqual(['c']);
    expect(ticketsInTab(rows, 'expired').map((row) => row.id)).toEqual(['b']);
    expect(availableTickets(rows)).toHaveLength(2);
  });

  it('spends the ticket that expires first', () => {
    expect(firstSpendable(rows)?.id).toBe('d');
    expect(firstSpendable(ticketsInTab(rows, 'used'))).toBeNull();
  });
});
