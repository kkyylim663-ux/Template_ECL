import type { ApiEnvelope } from './schemas';

/**
 * Transport layer for every data read. Mirrors the backend contract described in
 * docs/API_OBSERVED.md: one POST per call, `a/{name}`, answering with the
 * `{ status, msg, d }` envelope where `status === '0'` means success.
 *
 * Mock mode (`NEXT_PUBLIC_USE_MOCK=1`, the default) answers from `mocks/` and
 * never touches the network. Switching to the real service is a matter of
 * setting `NEXT_PUBLIC_USE_MOCK=0` and `NEXT_PUBLIC_API_BASE` — no call site
 * changes.
 *
 * SERVER-ONLY in practice: the mock registry is ~650 KB of JSON, so call this
 * from server components or route handlers, never from a client component.
 */
export const MOCK_MODE = process.env.NEXT_PUBLIC_USE_MOCK !== '0';

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? '').replace(/\/+$/, '');

export class ApiError extends Error {
  readonly endpoint: string;
  /** Envelope status, an HTTP status, or a local code such as `mock_missing`. */
  readonly code: string;

  constructor(message: string, code: string, endpoint: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.endpoint = endpoint;
  }
}

export async function callApi<T = unknown>(name: string, body?: unknown): Promise<ApiEnvelope<T>> {
  const envelope = MOCK_MODE ? await mockCall<T>(name, body) : await liveCall<T>(name, body);

  if (envelope.status !== '0') {
    throw new ApiError(envelope.msg || 'Request failed', envelope.status, name);
  }
  return envelope;
}

async function mockCall<T>(name: string, body?: unknown): Promise<ApiEnvelope<T>> {
  // Imported on demand so the fixture JSON is only pulled in when mock mode runs.
  const { MOCK_ENDPOINTS } = await import('@/mocks');
  const handler = MOCK_ENDPOINTS[name];
  if (!handler) {
    throw new ApiError(`No mock registered for "${name}"`, 'mock_missing', name);
  }
  // The body reaches the mock the same way it reaches the live endpoint, so a
  // parameterised lookup (promotion id, faq topic) behaves identically.
  return { status: '0', msg: 'Done', d: (await handler(body)) as T };
}

async function liveCall<T>(name: string, body?: unknown): Promise<ApiEnvelope<T>> {
  if (!API_BASE) {
    throw new ApiError('NEXT_PUBLIC_API_BASE is empty', 'no_base_url', name);
  }

  const response = await fetch(`${API_BASE}/a/${name}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new ApiError(`HTTP ${response.status}`, String(response.status), name);
  }

  try {
    return (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError('Response was not JSON', 'bad_json', name);
  }
}
