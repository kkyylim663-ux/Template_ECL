import type { Metadata } from 'next';
import { getAccountPayload } from '@/lib/api';
import { UseTicketButton } from '@/components/account/actions';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function TicketsPage() {
  const payload = await getAccountPayload();

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-ink text-sm font-semibold">Ticket center</h2>
        <p className="text-muted mt-1 text-xs">
          Tickets are earned from play; each event spends a fixed number.
        </p>
      </header>

      <ul className="grid gap-3 desktop:grid-cols-3">
        {payload.tickets.map((ticket) => (
          <li key={ticket.id} className="border-line bg-panel rounded-[var(--radius-panel)] border p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-ink text-sm font-semibold">{ticket.name}</p>
              <span
                className={`rounded-[var(--radius-tag)] px-2 py-0.5 text-[10px] font-semibold ${
                  ticket.status === 'open' ? 'bg-accent text-[#1b1b1b]' : 'bg-panel-soft text-muted'
                }`}
              >
                {ticket.status}
              </span>
            </div>
            <p className="text-muted mt-1 text-xs">{ticket.description}</p>
            <p className="text-muted mt-2 text-[11px]">
              Tickets held: <span className="text-ink">{ticket.ticketsHeld}</span> · required:{' '}
              <span className="text-ink">{ticket.ticketsRequired}</span>
            </p>
            <p className="text-muted mt-0.5 text-[11px]">
              {ticket.opensAt.slice(0, 10)} – {ticket.closesAt.slice(0, 10)}
            </p>
            <div className="mt-3">
              <UseTicketButton ticketsHeld={ticket.ticketsHeld} needed={ticket.ticketsRequired} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
