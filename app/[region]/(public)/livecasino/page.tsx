import type { Metadata } from 'next';
import { getCategoryProviderCards } from '@/lib/api';
import { ProviderCardGrid } from '@/components/game/ProviderCardGrid';

export const metadata: Metadata = {
  title: 'Live casino',
  description: 'Live dealer studios, browsable only in this build.',
};

export default async function LiveCasinoPage() {
  const providers = await getCategoryProviderCards('livecasino');

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-ink text-xl font-semibold">Live casino</h1>
          <p className="text-muted mt-1 text-xs">{providers.length} live studios</p>
        </div>
        <p className="text-muted text-xs">
          Launching shows a VPN notice — no table is entered in this build.
        </p>
      </header>

      <div className="mt-5">
        <ProviderCardGrid providers={providers} category="livecasino" vpnNotice />
      </div>
    </div>
  );
}
