import type { Metadata } from 'next';
import { getCategoryProviderCards } from '@/lib/api';
import { ProviderCardGrid } from '@/components/game/ProviderCardGrid';

export const metadata: Metadata = {
  title: 'Esports',
  description: 'Esports providers — browsable only in this build.',
};

export default async function EsportsPage() {
  const providers = await getCategoryProviderCards('esports');

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-ink text-xl font-semibold">Esports</h1>
          <p className="text-muted mt-1 text-xs">{providers.length} esports providers</p>
        </div>
        <p className="text-muted text-xs">
          Launching shows a VPN notice — no tournament page is entered in this build.
        </p>
      </header>

      <div className="mt-5">
        <ProviderCardGrid providers={providers} category="esports" vpnNotice />
      </div>
    </div>
  );
}
