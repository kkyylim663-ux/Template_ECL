import { NextResponse } from 'next/server';
import { getTicketsInfo } from '@/lib/api/tickets';
import { ticketStore } from '@/lib/mock-tickets/store';
import { availableTickets, firstSpendable } from '@/lib/ticket-rules';
import { ticketEvent } from '@/config/tickets';

/**
 * MOCK-ONLY: spending a ticket to enter an event from the "Use Tickets Now"
 * dialog (the reference navigates to the event page from its own picker). The
 * server picks which ticket goes — the one that expires first — and records the
 * spend so the ticket lands under "Used". `idempotencyKey` makes a double submit
 * spend one ticket; the replay check runs before the availability check, so a
 * retried request still reads as the same spend.
 */
export async function POST(request: Request) {
  let body: { eventId?: unknown; idempotencyKey?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return envelope('14', 'Invalid Format', 400);
  }

  const { eventId, idempotencyKey } = body;
  if (
    typeof eventId !== 'string' ||
    eventId.length === 0 ||
    typeof idempotencyKey !== 'string' ||
    idempotencyKey.length === 0
  ) {
    return envelope('14', 'Invalid Format', 400);
  }

  const event = ticketEvent(eventId);
  if (!event) return envelope('404', 'Event not found', 404);

  const info = await getTicketsInfo().catch(() => null);
  if (!info) return envelope('1', 'tickets unavailable', 503);

  const ticket = firstSpendable(info.tickets);
  if (!ticket) return envelope('409', 'No ticket available', 409);

  const result = await ticketStore.spend(
    { ticketId: ticket.id, eventId: event.id, eventName: event.id, idempotencyKey },
    { availableIds: availableTickets(info.tickets).map((row) => row.id), now: new Date() },
  );

  if (!result.ok) {
    if (result.code === '409') return envelope('409', 'Ticket already used', 409);
    return envelope('404', 'Ticket not found', 404);
  }

  return NextResponse.json({ status: '0', msg: 'Done', d: { spend: result.entry } });
}

function envelope(status: string, msg: string, http: number) {
  return NextResponse.json({ status, msg, d: null }, { status: http });
}
