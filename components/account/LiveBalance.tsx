'use client';

import { useWallets } from '@/lib/api/useWallets';
import { formatMinorPlain } from '@/lib/format';

/**
 * A balance read from the same wallet service as the header and the wallet
 * list. Until the wallet state is known it prints a dash rather than a number,
 * so the page never flashes a figure that is about to change.
 */
export function LiveBalance({ field = 'total' }: { field?: 'main' | 'total' }) {
  const { ready, mainMinor, totalMinor } = useWallets();
  if (!ready) return <>—</>;
  return <>{formatMinorPlain(field === 'total' ? totalMinor : mainMinor)}</>;
}
