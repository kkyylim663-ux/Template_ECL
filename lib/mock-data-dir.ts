import { join } from 'node:path';

/**
 * Directory the mock stores keep their runtime files in. Defaults to
 * `.mock-data` next to the app; T77's e2e suites point each of their servers
 * (and test processes) at `.mock-data/<suite>` via `MOCK_DATA_DIR`, so the four
 * suites can run in parallel without sharing writable fixtures.
 *
 * MOCK-ONLY: goes away with the stores themselves when the real backend lands.
 */
export function mockDataDir(): string {
  return process.env.MOCK_DATA_DIR || join(process.cwd(), '.mock-data');
}

/** Absolute path of one store file inside the mock data directory. */
export function mockDataFile(name: string): string {
  return join(mockDataDir(), name);
}
