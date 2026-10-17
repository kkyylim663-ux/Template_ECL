'use client';

import { useSyncExternalStore } from 'react';

/**
 * The build has one breakpoint (app/globals.css): `<=768px` renders the mobile
 * shell, `>=769px` the desktop one — Tailwind's `desktop:` variant is
 * `min-width: 769px`. Media queries read the layout viewport, so this agrees
 * with the CSS even under the `--m-scale` mobile zoom.
 *
 * The server snapshot is `false` (the desktop side of the breakpoint) because a
 * server render has no viewport, and a client first pass that disagreed with
 * the markup would fail hydration. The breakpoint-split chrome is mounted by
 * `ssr: false` dynamics (components/layout/BreakpointChrome.tsx), so the server
 * render never has to answer this question.
 */
export const MOBILE_QUERY = '(max-width: 768px)';

function subscribe(onChange: () => void) {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function getSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
