/**
 * The voucher (promo code) rules (T66). The reference's dialog posts the code to
 * `/{country}/a/bonusAction?code=…` and prints the answer it gets back, so the
 * outcomes this build has to reach are the reference's own messages: a code that
 * is unknown, one that was already redeemed, one outside its window ("not
 * redeemable as it's haven't start or it's already expired") and one whose stock
 * ran out ("The Vouchers are Finished Redeemed").
 *
 * The catalogue, its stock counter and the "my vouchers" list are this build's —
 * the reference keeps them in the backend (registered in ecl-site/MOCK_INVENTORY.md).
 * Pure functions: the route, the dialog and the tests share them.
 */

/** The reference's dialog takes free text; the tickets dialog's own shape is 3–32 letters, digits or dashes. */
export const VOUCHER_CODE_PATTERN = /^[A-Za-z0-9-]{3,32}$/;

/** A code the mock catalogue hands out (MOCK-ONLY fixture, `mocks/voucher-codes.json`). */
export type VoucherOffer = {
  code: string;
  amountMinor: number;
  startsAt: string;
  expiresAt: string;
  /** The backend's stock counter: how many vouchers this code still has. */
  left: number;
};

export type VoucherWindowState = 'scheduled' | 'open' | 'expired';
export type VoucherAvailability = 'open' | 'not-redeemable' | 'finished';
export type VoucherStatus = 'active' | 'expired';
export type VoucherIssue = 'required' | 'format';

export function normalizeVoucherCode(code: string): string {
  return code.trim().toUpperCase();
}

/** The dialog's own validation, before anything is sent. */
export function voucherCodeIssue(code: string): VoucherIssue | null {
  const trimmed = code.trim();
  if (trimmed.length === 0) return 'required';
  if (!VOUCHER_CODE_PATTERN.test(trimmed)) return 'format';
  return null;
}

/**
 * Where the code sits in its own window. An unreadable date counts as expired,
 * and a window that ends exactly at `now` is over — the same reading the ticket
 * rules use.
 */
export function voucherWindowState(offer: VoucherOffer, now: Date): VoucherWindowState {
  const nowMs = now.getTime();
  const startsAt = new Date(offer.startsAt).getTime();
  const expiresAt = new Date(offer.expiresAt).getTime();
  if (!Number.isNaN(startsAt) && startsAt > nowMs) return 'scheduled';
  if (Number.isNaN(expiresAt) || expiresAt <= nowMs) return 'expired';
  return 'open';
}

/** How many vouchers the code still has: the backend's counter minus what this store handed out. */
export function vouchersLeft(offer: VoucherOffer, claimed: number): number {
  return Math.max(0, offer.left - Math.max(0, claimed));
}

/** The window answers first, then the stock — either way the reference has its own message. */
export function voucherAvailability(
  offer: VoucherOffer,
  claimed: number,
  now: Date,
): VoucherAvailability {
  if (voucherWindowState(offer, now) !== 'open') return 'not-redeemable';
  if (vouchersLeft(offer, claimed) <= 0) return 'finished';
  return 'open';
}

/** A redeemed voucher is spendable until the code's own expiry, then expired. */
export function voucherStatus(expiresAt: string, now: Date): VoucherStatus {
  const expires = new Date(expiresAt).getTime();
  if (Number.isNaN(expires) || expires <= now.getTime()) return 'expired';
  return 'active';
}
