/**
 * The event picker behind "Use Tickets Now" (T65). The reference renders one
 * `.modal-event-item` per event inside `#ticketModal` and navigates to the
 * item's own `data-url` (`crawl/pages/my_ticket-center.html`, `selectEvent()` /
 * `goToSelectedEvent()`); its two items are Prediction and Number Game. The
 * paths are this build's region-relative routes (the reference stores absolute
 * ones) — the picker joins them with the current region.
 */
export const TICKET_EVENTS = [
  { id: 'prediction', path: '/prediction' },
  { id: 'number-game', path: '/numbergame' },
] as const;

export type TicketEventId = (typeof TICKET_EVENTS)[number]['id'];

export function ticketEvent(id: string): (typeof TICKET_EVENTS)[number] | null {
  return TICKET_EVENTS.find((event) => event.id === id) ?? null;
}
