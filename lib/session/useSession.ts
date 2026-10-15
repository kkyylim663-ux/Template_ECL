'use client';

import { useCallback, useEffect, useState } from 'react';

export type SessionState = {
  /** False until the first `/api/mock-auth/session` answer arrives. */
  ready: boolean;
  member: boolean;
  username: string | null;
  refresh: () => Promise<void>;
};

type SessionBody = { member: boolean; username: string | null };

/** Dispatched on `window` after sign-in so every mounted session view re-checks. */
export const SESSION_EVENT = 'brand:session-change';

/**
 * Client view of the httpOnly session. The cookie itself is never readable from
 * script; the route handler answers only whether a member is signed in.
 *
 * Until the first answer, `member` is false, which matches the server HTML, so
 * a signed-in visitor sees the guest header for a moment and then the member one.
 */
export function useSession(): SessionState {
  const [state, setState] = useState<Omit<SessionState, 'refresh'>>({
    ready: false,
    member: false,
    username: null,
  });

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/mock-auth/session', { cache: 'no-store' });
      const body = (await response.json()) as { d: SessionBody };
      setState({ ready: true, member: body.d.member, username: body.d.username });
    } catch {
      setState((current) => ({ ...current, ready: true }));
    }
  }, []);

  useEffect(() => {
    void refresh();
    window.addEventListener(SESSION_EVENT, refresh);
    return () => window.removeEventListener(SESSION_EVENT, refresh);
  }, [refresh]);

  return { ...state, refresh };
}
