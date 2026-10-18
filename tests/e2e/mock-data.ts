import { rm } from 'node:fs/promises';
import { mockDataFile } from '../../lib/mock-data-dir';

export { mockDataFile };

/**
 * Drops a runtime store file so the next read falls back to the `mocks/` seed.
 * Both this path and the server's come from `mock-data-dir`'s `MOCK_DATA_DIR`,
 * so they always name the same directory — one per suite since T77, which is
 * what lets the four suites run at once without sharing writable fixtures.
 */
export async function resetStore(name: string): Promise<void> {
  await rm(mockDataFile(name), { force: true });
}
