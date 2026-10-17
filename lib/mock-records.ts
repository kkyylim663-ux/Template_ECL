// MOCK-ONLY: the plumbing the two local record lists share — the deposit credit
// (T59A) and the withdrawal settlement (T59B) both mirror rows to localStorage
// and both need the open panels to notice. Client-safe: no server imports.

/** Fired on `window` after a record is written, so a mounted panel re-reads. */
export const RECORDS_EVENT = 'brand:records-change';

export function readRecordList(key: string): unknown[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function announceRecords(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(RECORDS_EVENT));
}
