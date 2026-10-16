/**
 * Deposit-flow helpers that BOTH the client components and the server pages
 * need: the `?status=` normaliser and the two URL builders of T54's gateway
 * leg. Kept free of any server import (unlike `lib/api/deposit.ts`, which
 * reaches the mock registry) so a `'use client'` component can import it.
 */

/** The three rulings the mock gateway can hand down, plus the unknown fallback. */
export const DEPOSIT_RESULT_STATUSES = ['success', 'failed', 'processing'] as const;

export type DepositResultStatus = (typeof DEPOSIT_RESULT_STATUSES)[number] | 'unknown';

/** `?status=` accepts only the three words; anything else — or nothing — is 'unknown'. */
export function normalizeDepositResultStatus(
  value: string | string[] | undefined,
): DepositResultStatus {
  const raw = Array.isArray(value) ? value[0] : value;
  return (DEPOSIT_RESULT_STATUSES as readonly string[]).includes(raw ?? '')
    ? (raw as DepositResultStatus)
    : 'unknown';
}

/** `/my/account/deposit/gateway?order=…` — where the mock stands in for `d.R_PGURL`. */
export function depositGatewayUrl(region: string, orderId: string): string {
  return `/${region}/account/deposit/gateway?order=${encodeURIComponent(orderId)}`;
}

/** Where the ruled gateway sends the browser back: the in-site result page (T54). */
export function depositResultUrl(region: string, orderId: string, status: string): string {
  return `/${region}/account/deposit/result?status=${encodeURIComponent(status)}&order=${encodeURIComponent(orderId)}`;
}
