import type { Metadata } from 'next';
import { getAccountPayload } from '@/lib/api';
import { getT } from '@/lib/i18n/server';
import { UseTicketButton } from '@/components/account/actions';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function TicketsPage() {
  const [{ t }, payload] = await Promise.all([getT('account'), getAccountPayload()]);

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-ink text-sm font-semibold">{t('tickets.title')}</h2>
        <p className="text-muted mt-1 text-xs">{t('tickets.intro')}</p>
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
                {t(`tickets.status.${ticket.status}`)}
              </span>
            </div>
            <p className="text-muted mt-1 text-xs">{ticket.description}</p>
            <p className="text-muted mt-2 text-[11px]">
              {t('tickets.heldLine', {
                held: ticket.ticketsHeld,
                required: ticket.ticketsRequired,
              })}
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
