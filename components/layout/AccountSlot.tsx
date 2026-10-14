'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { readDemoSessionFromDocument } from '@/lib/session';

/**
 * Header account area. Renders the guest state on the server so public pages stay
 * static; once mounted it swaps to the member state if the demo session cookie is
 * present.
 */
export function AccountSlot({ region }: { region: string }) {
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    setIsMember(readDemoSessionFromDocument());
  }, []);

  if (!isMember) {
    return (
      <div className="flex items-center gap-4">
        <Link href={`/${region}/login`} className="text-ink hover:text-accent text-sm font-medium">
          Login
        </Link>
        <Link
          href={`/${region}/register`}
          className="bg-accent text-[#1b1b1b] hover:bg-accent-bright rounded-[8px] px-4 py-2 text-sm font-semibold"
        >
          Register
        </Link>
      </div>
    );
  }

  return (
    <div className="group relative">
      <button
        type="button"
        className="flex items-center gap-2.5"
        aria-label="Account summary"
      >
        <span className="bg-panel-soft text-accent border-line grid size-9 place-items-center rounded-full border text-xs font-semibold">
          BR
        </span>
        <span className="text-left">
          <span className="text-ink block text-xs leading-tight font-medium">demo_player</span>
          <span className="text-muted block text-[11px] leading-tight">Balance: RM 1,234.50</span>
        </span>
      </button>

      <div className="border-line bg-panel-alt invisible absolute top-full right-0 z-40 mt-2 w-56 rounded-[var(--radius-panel)] border p-3 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100">
        <p className="text-muted text-[11px] tracking-wide uppercase">Account summary</p>
        <dl className="mt-2 space-y-1 text-xs">
          <div className="flex justify-between">
            <dt className="text-muted">Main wallet</dt>
            <dd className="text-ink">RM 1,234.50</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Unread</dt>
            <dd className="text-ink">2</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">VIP</dt>
            <dd className="text-accent">Silver</dd>
          </div>
        </dl>
        <p className="border-line text-muted mt-3 border-t pt-2 text-[11px]">
          Demo values — no backend yet.
        </p>
      </div>
    </div>
  );
}
