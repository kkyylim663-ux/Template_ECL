'use client';

import { useState } from 'react';
import { LazyImage } from '@/components/ui/LazyImage';
import { Marquee } from '@/components/ui/Marquee';
import { useModal } from '@/components/ui/ModalProvider';
import { GameCardSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';

const DEMO_TABS: TabItem[] = [
  { id: 'top', label: 'Top', count: 26 },
  { id: 'all', label: 'All', count: 698 },
  { id: 'new', label: 'New', count: 12 },
  { id: 'bbonus', label: 'Buy bonus', count: 40 },
];

const DEMO_TILES = Array.from({ length: 12 }, (_, index) => ({
  id: `tile-${index}`,
  name: `Placeholder title ${index + 1}`,
  tone: (index * 37) % 359,
}));

/** Every base component on one page, so each one can be seen and prodded. */
export default function ComponentsDemoPage() {
  const modal = useModal();
  const toast = useToast();
  const [tab, setTab] = useState('all');

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <p className="text-muted text-[11px] tracking-widest uppercase">Dev only</p>
      <h1 className="text-ink mt-1 text-2xl font-semibold">Base components</h1>
      <p className="text-muted mt-2 text-sm">
        Modal (7 variants), Toast, Tabs, Skeleton, Marquee, LazyImage. Escape closes a dialog;
        hovering the marquee pauses it; with <code>prefers-reduced-motion</code> it does not move at
        all.
      </p>

      <section className="mt-8">
        <h2 className="text-ink text-sm font-semibold">Modal variants</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <DemoButton onClick={() => modal.success('Deposit received', 'Request #4821 is queued for review.')}>
            success
          </DemoButton>
          <DemoButton onClick={() => modal.error('Could not submit', 'The amount is below the minimum.')}>
            error
          </DemoButton>
          <DemoButton onClick={() => modal.alert('VPN detected', 'Turn off your VPN before launching a live table.')}>
            alert
          </DemoButton>
          <DemoButton onClick={() => modal.status('Processing', 'Withdrawals are reviewed within 15 minutes.')}>
            status
          </DemoButton>
          <DemoButton onClick={() => modal.message('Message', 'A short neutral note.')}>message</DemoButton>
          <DemoButton onClick={() => modal.loading('Launching…')}>loading</DemoButton>
          <DemoButton
            onClick={() =>
              modal.rules(
                'Promotion rules',
                'Turnover counts slots at 100%, live casino at 20% and sports at 15%. 4D does not contribute. Stakes on both sides of a market do not count.',
              )
            }
          >
            rules
          </DemoButton>
          <DemoButton
            onClick={() =>
              modal.confirm('Cancel this request?', 'Cancelling cannot be undone.', () =>
                toast.success('Request cancelled'),
              )
            }
          >
            confirm flow
          </DemoButton>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-ink text-sm font-semibold">Toast</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <DemoButton label="Toast: info" onClick={() => toast.show('Balance refreshed')} />
          <DemoButton label="Toast: success" onClick={() => toast.success('Voucher redeemed')} />
          <DemoButton
            label="Toast: error"
            onClick={() => toast.error('Amount exceeds the balance')}
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-ink text-sm font-semibold">Tabs</h2>
        <div className="mt-3">
          <Tabs tabs={DEMO_TABS} value={tab} onChange={setTab} label="Demo tabs" />
          <p className="text-muted mt-2 text-xs">
            active tab: <span className="text-ink">{tab}</span>
          </p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-ink text-sm font-semibold">Skeleton</h2>
        <div className="mt-3 grid grid-cols-2 gap-4 desktop:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => (
            <GameCardSkeleton key={index} />
          ))}
        </div>
        <div className="mt-3 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-ink text-sm font-semibold">Marquee (pure CSS)</h2>
      </section>
      <Marquee
        className="mt-3 rounded-[var(--radius-tag)]"
        items={[
          'Congratulations to user ****8899 for winning RM 12,480 in draw #4471',
          'Withdrawals under RM 1,000 are processed in about 5 minutes',
          'Weekly turnover race closes Sunday 23:59',
          'Scheduled maintenance every Tuesday 04:00-05:00 (+08:00)',
        ]}
      />

      <section className="mt-8">
        <h2 className="text-ink text-sm font-semibold">LazyImage</h2>
        <p className="text-muted mt-1 text-xs">
          Left group has a source (a local placeholder file) and only loads when scrolled into view;
          right group has no source at all and renders the gradient placeholder.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 desktop:grid-cols-6">
          {DEMO_TILES.map((tile) => (
            <LazyImage
              key={tile.id}
              src="/brand/tile.svg"
              alt={tile.name}
              tone={tile.tone}
              className="rounded-[var(--radius-panel)] border border-line"
            />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 desktop:grid-cols-6">
          {DEMO_TILES.slice(0, 6).map((tile) => (
            <LazyImage
              key={`no-src-${tile.id}`}
              alt={tile.name}
              tone={tile.tone}
              className="rounded-[var(--radius-panel)] border border-line"
            />
          ))}
        </div>
      </section>

      <div className="h-40" />
    </main>
  );
}

function DemoButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label?: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-line text-ink hover:border-accent hover:text-accent rounded-[8px] border px-3 py-2 text-xs font-medium"
    >
      {label ?? `Open ${children} modal`}
    </button>
  );
}
