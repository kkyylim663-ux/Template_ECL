import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * T49.5: the demo marker and the mock transport share one switch. With
 * `NEXT_PUBLIC_USE_MOCK=0` both turn off, so wiring a real backend removes the
 * marker with the mocks (the badge itself renders only when `MOCK_MODE`).
 */
describe('mock switch', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('defaults to mock mode', async () => {
    vi.resetModules();
    const { MOCK_MODE } = await import('@/lib/api/client');
    expect(MOCK_MODE).toBe(true);
  });

  it('turns off when NEXT_PUBLIC_USE_MOCK=0', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK', '0');
    vi.resetModules();
    const { MOCK_MODE } = await import('@/lib/api/client');
    expect(MOCK_MODE).toBe(false);
  });
});
