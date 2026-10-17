import type { Metadata } from 'next';
import { getAccountPayload } from '@/lib/api';
import { getTicketsInfo } from '@/lib/api/tickets';
import { formatDate } from '@/lib/format';
import { regionConfig, type RegionCode } from '@/config/brand';
import { regionPath } from '@/config/nav';
import { getT } from '@/lib/i18n/server';
import { TICKETS_PER_DEPOSIT_MINOR, TICKET_CAP } from '@/lib/ticket-rules';
import { TicketCenter } from '@/components/account/TicketCenter';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT('nav');
  return { title: t('items.tickets'), robots: { index: false, follow: false } };
}

/** Tickets accrue MYR 500 of deposits at a time, and the account caps at 200. */
const PER_TICKET_MINOR = TICKETS_PER_DEPOSIT_MINOR;

/**
 * Standalone page, like the original: banner band, the ticket card, the
 * three-button row, this build's ticket list and the Ticket History table. No
 * account menu or balance strip.
 *
 * The ticket rows are composed on the server (fixture events + the redemption
 * store) and handed to the panel, so the first paint carries them — the zh-Hans
 * i18n probe reads the server HTML.
 */
export default async function TicketsPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const [payload, tickets] = await Promise.all([getAccountPayload(), getTicketsInfo()]);
  const { symbol } = regionConfig(region as RegionCode);

  const deposits = payload.transactions
    .filter((transaction) => transaction.kind === 'deposit' && transaction.status === 'approved')
    .reduce((sum, transaction) => sum + transaction.amountMinor, 0);

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
        symbol={symbol}
        cap={TICKET_CAP}
        perDeposit="500.00"
        progressMinor={deposits % PER_TICKET_MINOR}
        perTicketMinor={PER_TICKET_MINOR}
        region={region}
        depositHref={regionPath(region, '/account/deposit')}
        events={events}
        initial={tickets}
      />
    </>
  );
}
