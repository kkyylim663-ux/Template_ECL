import { callApi, ApiError } from './client';
import { ENDPOINTS } from './endpoints';
import type { SessionUser } from '@/lib/session';

export type LoginBody = {
  identifier: string;
  password?: string;
  otp?: string;
};

/**
 * Checks a sign-in attempt. Returns the account on success and `null` for any
 * mismatch, so the caller can answer with one generic message and never reveal
 * whether the identifier exists.
 *
 * Server-only: the mock behind `login` contains test credentials.
 */
export async function authenticate(body: LoginBody): Promise<SessionUser | null> {
  try {
    const { d } = await callApi<SessionUser | null>(ENDPOINTS.login, body);
    return d ?? null;
  } catch (error) {
    if (error instanceof ApiError) return null;
    throw error;
  }
}
