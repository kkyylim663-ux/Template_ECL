import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import seed from '@/mocks/bank-accounts.json';
import { boundBankAccountSchema } from '@/lib/api/schemas';
import { bankAccountFormSchema, validate } from '@/lib/forms';
import { createBankAccountStore, seedAccounts } from '@/lib/mock-withdrawal/banks';
import {
  MAX_BOUND_ACCOUNTS,
  maskAccountNumber,
  normalizeAccountNumber,
} from '@/lib/withdrawal-flow';

/**
 * T57's contract: the bound-account store behind `/account/banks` (cap, the
 * reference's duplicate rule, the default badge, persistence), the pure number
 * helpers, and the add form's rules. The reference's old form is the source of
 * the validation wording (`err_add_acc_*`); the cap of three and the digit range
 * are this build's — the capture documents neither.
 */
const draft = (over: Partial<{ bankId: string; accountName: string; accountNumber: string }> = {}) => ({
  bankId: 'rhb',
  accountName: 'Demo Player',
  accountNumber: '214055678801',
  ...over,
});

describe('bound account fixture', () => {
  it('parses with the info schema and masks to the last four digits', () => {
    expect(seedAccounts).toHaveLength(2);
    for (const account of seedAccounts) expect(() => boundBankAccountSchema.parse(account)).not.toThrow();
    expect(seedAccounts.map((account) => maskAccountNumber(account.accountNumber))).toEqual([
      '**** 4471',
      '**** 8890',
    ]);
  });
});

describe('number helpers', () => {
  it('keeps digits only and masks down to the last four', () => {
    expect(normalizeAccountNumber('5142 8890 4471')).toBe('514288904471');
    expect(maskAccountNumber('5142 8890 4471')).toBe('**** 4471');
    expect(maskAccountNumber('214055678801')).toBe('**** 8801');
  });
});

describe('add form schema', () => {
  it('accepts a bank, a name and 6–20 digits', () => {
    expect(validate(bankAccountFormSchema, draft()).ok).toBe(true);
    expect(validate(bankAccountFormSchema, draft({ accountNumber: '1'.repeat(20) })).ok).toBe(true);
  });

  it('names the field that is missing, like the reference dictionary does', () => {
    const empty = validate(bankAccountFormSchema, draft({ bankId: '', accountNumber: '' }));
    expect(empty.ok).toBe(false);
    if (!empty.ok) {
      expect(empty.errors.bankId).toBe('validation.bankRequired');
      expect(empty.errors.accountNumber).toBe('validation.accountNumberRequired');
    }

    const noName = validate(bankAccountFormSchema, draft({ accountName: ' ' }));
    expect(noName.ok).toBe(false);
    if (!noName.ok) expect(noName.errors.accountName).toBe('validation.accountNameRequired');
  });

  it('rejects a number outside the digit range and any separator left in it', () => {
    for (const accountNumber of ['12345', '1'.repeat(21)]) {
      const result = validate(bankAccountFormSchema, draft({ accountNumber }));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.accountNumber).toBe('validation.accountNumberLength');
    }
    // The form strips separators as it types; the schema is the second gate.
    expect(validate(bankAccountFormSchema, draft({ accountNumber: '2140 5567 8801' })).ok).toBe(false);
  });
});

describe('bound account store', () => {
  it('binds a fresh account as Pending, digits only, default while the list is empty', async () => {
    const store = createBankAccountStore({ file: null, seedAccounts: [] });
    const created = await store.create(draft({ accountNumber: '2140 5567 8801' }));

    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.account.accountNumber).toBe('214055678801');
    expect(created.account.verified).toBe(false);
    expect(created.account.isDefault).toBe(true);

    const second = await store.create(draft({ accountNumber: '702133488890' }));
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.account.isDefault).toBe(false);
  });

  it(`refuses a ${MAX_BOUND_ACCOUNTS + 1}th account`, async () => {
    const store = createBankAccountStore({ file: null, seedAccounts: [] });
    for (let index = 0; index < MAX_BOUND_ACCOUNTS; index += 1) {
      const created = await store.create(draft({ accountNumber: `21405567880${index}` }));
      expect(created.ok).toBe(true);
    }
    const refused = await store.create(draft({ accountNumber: '702133488890' }));
    expect(refused).toEqual({ ok: false, reason: 'limit' });
  });

  it("refuses a number that is already registered (the reference's 205)", async () => {
    const store = createBankAccountStore({ file: null, seedAccounts: [] });
    await store.create(draft());
    // Same digits, different spacing: the number is the identity, not the string.
    const duplicate = await store.create(draft({ accountNumber: '2140 5567 8801' }));
    expect(duplicate).toEqual({ ok: false, reason: 'duplicate' });
  });

  it('edits the fields it is given, moving the default badge on request', async () => {
    const store = createBankAccountStore({ file: null });
    const [first, second] = seedAccounts;

    const renamed = await store.update(second.id, { accountName: 'Demo Two', accountNumber: '999900001111' });
    expect(renamed.ok).toBe(true);
    if (!renamed.ok) return;
    expect(renamed.account.accountName).toBe('Demo Two');
    expect(renamed.account.accountNumber).toBe('999900001111');

    const missing = await store.update('ba-nope', { accountName: 'Nobody' });
    expect(missing).toEqual({ ok: false, reason: 'missing' });

    const duplicate = await store.update(second.id, { accountNumber: first.accountNumber });
    expect(duplicate).toEqual({ ok: false, reason: 'duplicate' });

    await store.update(second.id, { isDefault: true });
    const list = await store.list();
    expect(list.filter((account) => account.isDefault).map((account) => account.id)).toEqual([second.id]);
  });

  it('hands the default badge to the next account when the default one goes', async () => {
    const store = createBankAccountStore({ file: null });
    const [first, second] = seedAccounts;

    const removed = await store.remove(first.id);
    expect(removed.ok).toBe(true);
    if (!removed.ok) return;
    expect(removed.defaultId).toBe(second.id);
    expect((await store.list()).map((account) => account.id)).toEqual([second.id]);

    const last = await store.remove(second.id);
    expect(last.ok).toBe(true);
    if (!last.ok) return;
    expect(last.defaultId).toBeNull();
    expect(await store.list()).toEqual([]);

    expect(await store.remove(second.id)).toEqual({ ok: false, reason: 'missing' });
  });

  it('persists through the file, so a refresh keeps the list', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ecl-banks-'));
    const file = join(dir, 'bank-accounts.json');
    try {
      const writer = createBankAccountStore({ file, seedAccounts: [] });
      const created = await writer.create(draft());
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      // A second store instance is what the next request builds: same file, same list.
      const reader = createBankAccountStore({ file, seedAccounts: [] });
      const list = await reader.list();
      expect(list.map((account) => account.id)).toEqual([created.account.id]);
      await reader.remove(created.account.id);
      expect(await writer.list()).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('seeds from the mock file when the store file is absent', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ecl-banks-'));
    try {
      const store = createBankAccountStore({ file: join(dir, 'nested', 'bank-accounts.json') });
      expect((await store.list()).map((account) => account.id)).toEqual(seed.d.accounts.map((a) => a.id));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
