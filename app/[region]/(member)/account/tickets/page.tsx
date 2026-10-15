import type { Metadata } from 'next';
import { getAccountPayload } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { regionConfig, type RegionCode } from '@/config/brand';
import { regionPath } from '@/config/nav';
import { getT } from '@/lib/i18n/server';
import { TicketCenter } from '@/components/account/TicketCenter';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT('nav');
  return { title: t('items.tickets'), robots: { index: false, follow: false } };
}

/** Tickets accrue MYR 500 of deposits at a time, and the account caps at 200. */
const PER_TICKET_MINOR = 50_000;
const TICKET_CAP = 200;

/**
 * Standalone page, like the original: banner band, the ticket card, the
 * three-button row and Ticket History. No account menu or balance strip.
 */
export default async function TicketsPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const payload = await getAccountPayload();
  const currency = regionConfig(region as RegionCode).currency;

  const deposits = payload.transactions
    .filter((transaction) => transaction.kind === 'deposit' && transaction.status === 'approved')
    .reduce((sum, transaction) => sum + transaction.amountMinor, 0);
  const held = payload.tickets.reduce((max, event) => Math.max(max, event.ticketsHeld), 0);

  const events = payload.tickets.map((event) => ({
    id: event.id,
    name: event.name,
    date: formatDate(event.closesAt),
    tickets: String(event.ticketsHeld),
    status: event.status,
  }));

  return (
    <>
      <section
        data-part="banner-section"
        aria-hidden
        className="page-hero game-placeholder h-40 max-desktop:h-28"
      />
      <TicketCenter
        held={held}
        cap={TICKET_CAP}
        perDeposit="500.00"
        progressMinor={deposits % PER_TICKET_MINOR}
        perTicketMinor={PER_TICKET_MINOR}
        currency={currency}
        events={events}
        depositHref={regionPath(region, '/account/deposit')}
      />
    </>
  );
}
