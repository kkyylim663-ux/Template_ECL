'use client';

import { brand } from '@/config/brand';
import { toneFromString } from '@/lib/game/tone';
import { LazyImage } from '@/components/ui/LazyImage';
import { useModal } from '@/components/ui/ModalProvider';
import { LaunchButton } from './LaunchButton';

export type ProviderCard = {
  id: string;
  totalGames: number;
};

/**
 * Studio cards for the live casino / sports / esports pages. Reference layout:
 * artwork slot, studio name, Play Now and Demo, both inert (`#`).
 *
 * `vpnNotice` marks the two categories where the reference build warns about a
 * VPN before launch; the modal is dismissible and nothing navigates either way.
 */
export function ProviderCardGrid({
  providers,
  category,
  vpnNotice = false,
}: {
  providers: ProviderCard[];
  category: string;
  vpnNotice?: boolean;
}) {
  const modal = useModal();

  return (
    <div className="grid grid-cols-2 gap-3 desktop:grid-cols-4 desktop:gap-5">
      {providers.map((provider) => (
        <article
          key={provider.id}
          data-provider={provider.id}
          data-category={category}
          className="group border-line bg-panel hover:border-accent rounded-[var(--radius-panel)] border p-3 transition-transform duration-200 hover:-translate-y-0.5"
        >
          <LazyImage alt={`${provider.id} studio`} tone={toneFromString(provider.id)} ratio="16 / 9" className="rounded-[10px]" />

          <h3 className="text-ink mt-3 text-center text-[15px] leading-tight font-semibold">
            {provider.id}
          </h3>
          <p className="text-muted mt-0.5 text-center text-[11px]">
            {provider.totalGames.toLocaleString('en-MY')} titles
          </p>

          <div className="mt-3 flex gap-2">
            <LaunchButton
              provider={provider.id}
              gameId={category}
              variant="primary"
              className="flex-1"
              onActivate={() => {
                if (vpnNotice) {
                  modal.alert(
                    'VPN detected',
                    `Turn off your VPN before opening a ${category} table. The ${brand.name} build never launches a game — this notice is the end of the flow.`,
                  );
                }
              }}
            />
            <LaunchButton
              provider={provider.id}
              gameId={category}
              mode="demo"
              label="Demo"
              variant="secondary"
              className="flex-1"
            />
          </div>
        </article>
      ))}
    </div>
  );
}
