'use client';

import { useEffect, useState } from 'react';

/**
 * Inbox read/delete state. The fixture is static, so like the pending
 * cancellations these live in localStorage: the inbox page records the unread
 * ids it saw, and the header badge recomputes from that snapshot — which is how
 * "open a message, the badge drops by one" works across components. Before the
 * member ever opens the inbox the store is empty and the server count stands.
 */
const KEY = 'brand:inbox:state';

/** Fired on window whenever the store changes, so the header can follow. */
export const INBOX_EVENT = 'brand:inbox-change';

export interface InboxState {
  /** The unread ids as the fixture served them. */
  unreadIds: string[];
  readIds: string[];
  deletedIds: string[];
}

const EMPTY: InboxState = { unreadIds: [], readIds: [], deletedIds: [] };

export function readInboxState(): InboxState {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return EMPTY;
    const state = parsed as Partial<InboxState>;
    return {
      unreadIds: Array.isArray(state.unreadIds) ? state.unreadIds : [],
      readIds: Array.isArray(state.readIds) ? state.readIds : [],
      deletedIds: Array.isArray(state.deletedIds) ? state.deletedIds : [],
    };
  } catch {
    return EMPTY;
  }
}

function writeInboxState(state: InboxState): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Private mode: the session still behaves, it just does not persist.
  }
  window.dispatchEvent(new Event(INBOX_EVENT));
}

/** Remembers which fixture ids were unread; merges, so later visits cannot forget. */
export function recordUnreadSnapshot(unreadIds: string[]): InboxState {
  const state = readInboxState();
  const merged = [...new Set([...state.unreadIds, ...unreadIds])];
  if (merged.length === state.unreadIds.length) return state;
  const next = { ...state, unreadIds: merged };
  writeInboxState(next);
  return next;
}

export function markMessagesRead(ids: string[]): InboxState {
  const state = readInboxState();
  const next = { ...state, readIds: [...new Set([...state.readIds, ...ids])] };
  writeInboxState(next);
  return next;
}

export function deleteMessages(ids: string[]): InboxState {
  const state = readInboxState();
  const next = { ...state, deletedIds: [...new Set([...state.deletedIds, ...ids])] };
  writeInboxState(next);
  return next;
}

/** Deleted or read ids stop counting as unread; unknown ids are ignored. */
export function unreadFromState(state: InboxState): number {
  const gone = new Set([...state.readIds, ...state.deletedIds]);
  return state.unreadIds.filter((id) => !gone.has(id)).length;
}

/** The badge: the store's answer once the inbox has been visited, else the server's. */
export function useUnreadCount(serverUnread: number): number {
  const [count, setCount] = useState(serverUnread);
  useEffect(() => {
    const sync = () => {
      const state = readInboxState();
      setCount(state.unreadIds.length > 0 ? unreadFromState(state) : serverUnread);
    };
    sync();
    window.addEventListener(INBOX_EVENT, sync);
    return () => window.removeEventListener(INBOX_EVENT, sync);
  }, [serverUnread]);
  return count;
}

/** The panel's per-render view of the store. */
export function useInboxState(): InboxState {
  const [state, setState] = useState<InboxState>(EMPTY);
  useEffect(() => {
    const sync = () => setState(readInboxState());
    sync();
    window.addEventListener(INBOX_EVENT, sync);
    return () => window.removeEventListener(INBOX_EVENT, sync);
  }, []);
  return state;
}
