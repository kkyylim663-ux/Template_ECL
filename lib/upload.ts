/**
 * The receipt step's rules and its local stand-in for the reference's
 * `uploadv2.php` POST (sdk.js:3845, `_Deposit.uploadRec`). Nothing here reads the
 * file's bytes: the mock derives its receipt id from the name and size alone, so
 * no content can reach a log, an error message or storage. The reference's input
 * accepted `image/*`; this build follows T53's own rule — one JPG, PNG or PDF,
 * at most 5 MB.
 */
export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;

/** The file input's `accept`; the dropzone checks against the same lists. */
export const RECEIPT_ACCEPT = '.jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf';

const RECEIPT_EXTENSIONS = ['jpg', 'jpeg', 'png', 'pdf'];
const RECEIPT_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

/** The three fields a rejection needs — a `File` satisfies this shape. */
export type ReceiptFile = { name: string; type: string; size: number };

/** Lower-cased extension without the dot; '' when the name carries none. */
export function receiptExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

/**
 * The message key a rejected file earns, or null when it is accepted. The
 * extension decides (some pickers hand over an empty `type`), and a MIME type
 * that is present at all has to be one of the three allowed ones.
 */
export function receiptRejection(file: ReceiptFile): string | null {
  if (!RECEIPT_EXTENSIONS.includes(receiptExtension(file.name))) return 'validation.receiptType';
  if (file.type && !RECEIPT_MIME_TYPES.includes(file.type)) return 'validation.receiptType';
  if (file.size > RECEIPT_MAX_BYTES) return 'validation.receiptSize';
  return null;
}

/** "4.7 MB" / "812 KB" — the size line under the picked file's name. */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/** A deterministic stand-in for the receipt id the upload endpoint would mint. */
export function mockReceiptId(file: ReceiptFile): string {
  const seed = `${file.name}:${file.size}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return `RCPT-${hash.toString(36).toUpperCase().padStart(6, '0')}`;
}

export type ReceiptUploadOptions = {
  /** Called with 10, 20 … 100 as the fake transfer advances. */
  onProgress?: (percent: number) => void;
  /** 1-based counter; attempt 1 fails when `failFirst` is set (retry demo). */
  attempt?: number;
  failFirst?: boolean;
  /** Time between progress ticks; the tests shorten it. */
  stepMs?: number;
};

/**
 * The local stand-in for `_Deposit.uploadRec()`: the same shape of an async
 * upload — progress callbacks, then a receipt id — with no request and no file
 * access, so a real endpoint can replace it wholesale. `failFirst` fails the
 * first attempt so the retry path is reachable without a server.
 */
export async function mockUploadReceipt(
  file: ReceiptFile,
  { onProgress, attempt = 1, failFirst = false, stepMs = 90 }: ReceiptUploadOptions = {},
): Promise<string> {
  for (let percent = 10; percent <= 100; percent += 10) {
    await delay(stepMs);
    onProgress?.(percent);
  }
  await delay(stepMs);
  if (failFirst && attempt === 1) throw new Error('receipt upload failed');
  return mockReceiptId(file);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
