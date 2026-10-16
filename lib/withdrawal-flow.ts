/**
 * Withdrawal-flow helpers that BOTH the client panel and its tests need: which
 * bound accounts can receive a payout and the "What to verify" rows. Kept free
 * of any server import (unlike `lib/api/withdrawal.ts`, which reaches the mock
 * registry) so a `'use client'` component can import it.
 */
import type { WithdrawalInfo } from '@/lib/api/schemas';

export type WithdrawalVerifyRowId = 'mobile' | 'bank' | 'email';

export type WithdrawalVerifyRow = {
  id: WithdrawalVerifyRowId;
  verified: boolean;
};

/**
 * Only a verified account can receive a payout — the reference's page loads its
 * dropdown from `a/getMyBankAccVerified` and auto-switches to its "New bank"
 * tab when the list is empty.
 */
export function verifiedBankAccounts(info: WithdrawalInfo) {
  return info.bankAccounts.filter((account) => account.verified);
}

/**
 * The "What to verify" rows, in the reference's order. Its SG market gates on
 * "Mobile Number, Bank Account and Email" (verify-tips-sg) with the bank row in
 * the middle; the MY market lists only "Mobile Number and Email"
 * (verify-tips-my). The mobile/email rows stand in for the profile's document
 * check (`kycStatus`).
 */
export function buildVerifyRows(input: {
  region: string;
  kycStatus: WithdrawalInfo['kycStatus'];
  hasVerifiedBank: boolean;
}): WithdrawalVerifyRow[] {
  const kycVerified = input.kycStatus === 'verified';

  return [
    { id: 'mobile', verified: kycVerified },
    ...(input.region === 'sg' ? [{ id: 'bank' as const, verified: input.hasVerifiedBank }] : []),
    { id: 'email', verified: kycVerified },
  ];
}

/** False when any row of the market's list still needs verification. */
export function verifyRowsComplete(rows: WithdrawalVerifyRow[]): boolean {
  return rows.every((row) => row.verified);
}

/* ------------------------------------------------ bound accounts (T57) */

/**
 * How many accounts one member may bind. The reference's banking-detail page
 * documents no cap (its add form is a plain bank + account name + number), so
 * three is this build's rule and the guard lives in the mock store.
 */
export const MAX_BOUND_ACCOUNTS = 3;

/** Account numbers are held as digits only; the form strips separators as it types. */
export function normalizeAccountNumber(value: string): string {
  return value.replace(/\D/g, '');
}

/** The list form of a number: last four digits, e.g. `514288904471` → `**** 4471`. */
export function maskAccountNumber(accountNumber: string): string {
  const digits = normalizeAccountNumber(accountNumber);
  return `**** ${digits.slice(-4).padStart(4, '*')}`;
}

/** Digits a bound account number may hold — the reference's own rule was not captured. */
export const ACCOUNT_NUMBER_MIN_DIGITS = 6;
export const ACCOUNT_NUMBER_MAX_DIGITS = 20;
