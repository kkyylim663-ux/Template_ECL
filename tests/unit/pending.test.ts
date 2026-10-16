import { describe, expect, it } from 'vitest';
import {
  CANCEL_WINDOW_MS,
  cancelWindowOpen,
  countdownText,
  visiblePendingRows,
} from '@/lib/api/pending';

/**
 * T47's table states. The predicates below decide which rows the panel renders
 * (including the empty case) and whether the reference's cancel action is still
 * inside its window; the e2e covers the flows themselves.
 */
describe('pending table state', () => {
  const createdAt = '2026-10-16T10:12:00+08:00';
  const created = new Date(createdAt).getTime();

  it('keeps the cancel window open for exactly 24 hours', () => {
    expect(cancelWindowOpen(createdAt, created)).toBe(true);
    expect(cancelWindowOpen(createdAt, created + CANCEL_WINDOW_MS)).toBe(true);
    expect(cancelWindowOpen(createdAt, created + CANCEL_WINDOW_MS + 1)).toBe(false);
  });

  it('treats an unparsable timestamp as closed', () => {
    expect(cancelWindowOpen('', created)).toBe(false);
    expect(cancelWindowOpen('not-a-date', created)).toBe(false);
  });

  it('hides cancelled rows and can produce the empty list', () => {
    const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(visiblePendingRows(rows, []).map((row) => row.id)).toEqual(['a', 'b', 'c']);
    expect(visiblePendingRows(rows, ['b']).map((row) => row.id)).toEqual(['a', 'c']);
    expect(visiblePendingRows(rows, ['a', 'b', 'c'])).toEqual([]);
  });

  it('formats the countdown, never below zero', () => {
    expect(countdownText(CANCEL_WINDOW_MS)).toBe('24:00:00');
    expect(countdownText(3_723_000)).toBe('01:02:03');
    expect(countdownText(-500)).toBe('00:00:00');
  });
});
