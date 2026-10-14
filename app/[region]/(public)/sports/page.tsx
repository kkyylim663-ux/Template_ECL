import type { Metadata } from 'next';
import { getCategoryProviderCards } from '@/lib/api';
import { ProviderCardGrid } from '@/components/game/ProviderCardGrid';

export const metadata: Metadata = {
  title: 'Sports',
  description: 'Sportsbook providers — browsable only in this build.',
};

export default async function SportsPage() {
  const providers = await getCategoryProviderCards('sports');

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-ink text-xl font-semibold">Sports</h1>
          <p className="text-muted mt-1 text-xs">{providers.length} sportsbook providers</p>
        </div>
        <p className="text-muted text-xs">Browse only — no bet slip is opened here.</p>
      </header>

      <div className="mt-5">
        <ProviderCardGrid providers={providers} category="sports" />
      </div>
    </div>
  );
}
