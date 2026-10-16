import { describe, expect, it, vi } from 'vitest';
import {
  RECEIPT_MAX_BYTES,
  formatBytes,
  mockReceiptId,
  mockUploadReceipt,
  receiptExtension,
  receiptRejection,
} from '@/lib/upload';

/** The picture a phone camera would hand over. */
const png = { name: 'receipt.png', type: 'image/png', size: 1024 };

describe('receiptRejection', () => {
  it('accepts jpg, jpeg, png and pdf at or under the size ceiling', () => {
    expect(receiptRejection(png)).toBeNull();
    expect(receiptRejection({ name: 'slip.JPG', type: 'image/jpeg', size: 2048 })).toBeNull();
    expect(receiptRejection({ name: 'slip.jpeg', type: 'image/jpeg', size: 2048 })).toBeNull();
    expect(receiptRejection({ name: 'slip.pdf', type: 'application/pdf', size: 2048 })).toBeNull();
    expect(receiptRejection({ ...png, size: RECEIPT_MAX_BYTES })).toBeNull();
  });

  it('accepts a file whose picker handed over no MIME type', () => {
    expect(receiptRejection({ name: 'photo.png', type: '', size: 1024 })).toBeNull();
  });

  it('rejects anything that is not jpg / png / pdf', () => {
    expect(receiptRejection({ name: 'notes.txt', type: 'text/plain', size: 10 })).toBe(
      'validation.receiptType',
    );
    expect(receiptRejection({ name: 'archive.zip', type: 'application/zip', size: 10 })).toBe(
      'validation.receiptType',
    );
    expect(receiptRejection({ name: 'noextension', type: '', size: 10 })).toBe(
      'validation.receiptType',
    );
    // A renamed executable fails on its extension even with a lying MIME type…
    expect(receiptRejection({ name: 'run.exe', type: 'image/png', size: 10 })).toBe(
      'validation.receiptType',
    );
    // …and an allowed extension with a foreign type fails too.
    expect(receiptRejection({ name: 'photo.png', type: 'text/html', size: 10 })).toBe(
      'validation.receiptType',
    );
  });

  it('rejects only what goes over the 5 MB ceiling', () => {
    expect(receiptRejection({ ...png, size: RECEIPT_MAX_BYTES + 1 })).toBe('validation.receiptSize');
  });
});

describe('formatBytes', () => {
  it('prints bytes, KB and MB', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(RECEIPT_MAX_BYTES)).toBe('5.0 MB');
    expect(formatBytes(RECEIPT_MAX_BYTES + 512 * 1024)).toBe('5.5 MB');
  });
});

describe('receiptExtension', () => {
  it('lower-cases the tail and tolerates dots in the name', () => {
    expect(receiptExtension('bank.slip.PNG')).toBe('png');
    expect(receiptExtension('noext')).toBe('');
  });
});

describe('mockUploadReceipt', () => {
  it('reports 10..100 and returns a deterministic id', async () => {
    vi.useFakeTimers();
    try {
      const seen: number[] = [];
      const pending = mockUploadReceipt(png, { onProgress: (percent) => seen.push(percent), stepMs: 10 });
      await vi.advanceTimersByTimeAsync(200);
      await expect(pending).resolves.toBe(mockReceiptId(png));
      expect(seen).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
      expect(mockReceiptId(png)).toMatch(/^RCPT-[0-9A-Z]{6,7}$/);
      // The id comes from the name and size alone — never the bytes.
      expect(mockReceiptId(png)).toBe(mockReceiptId({ ...png }));
      expect(mockReceiptId(png)).not.toBe(mockReceiptId({ ...png, size: 2048 }));
    } finally {
      vi.useRealTimers();
    }
  });

  it('fails the first attempt when asked, then succeeds on the retry', async () => {
    vi.useFakeTimers();
    try {
      const first = mockUploadReceipt(png, { failFirst: true, attempt: 1, stepMs: 10 });
      const rejected = expect(first).rejects.toThrow('receipt upload failed');
      await vi.advanceTimersByTimeAsync(200);
      await rejected;

      const retry = mockUploadReceipt(png, { failFirst: true, attempt: 2, stepMs: 10 });
      await vi.advanceTimersByTimeAsync(200);
      await expect(retry).resolves.toBe(mockReceiptId(png));
    } finally {
      vi.useRealTimers();
    }
  });
});
