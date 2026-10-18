'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Icon } from '@/components/ui/Icon';
import { PrimaryButton } from '@/components/ui/Field';
import { walletService } from '@/lib/api/wallet';
import { vouchersInfoSchema, type VoucherInfoRow } from '@/lib/api/schemas';
import { formatDate, formatMinor } from '@/lib/format';
import { creditVoucher } from '@/lib/voucher-claim';
import { useSession } from '@/lib/session/useSession';
import { voucherCodeIssue, type VoucherIssue } from '@/lib/voucher-rules';

/**
 * The site-wide Voucher (Promo Code) dialog, as on the reference build: an entry
 * in the header and one in the mobile drawer, both opening the same panel (#voucherRedempModal).
 *
 * The reference posts the code to `/{country}/a/bonusAction?code=…` and prints the
 * answer it gets back, so the five results below are its own messages (success,
 * invalid code, already redeemed, outside its window, stock finished). A guest is
 * asked to sign in; a signed-in visitor redeems for real — the mock route records
 * the code and the mock wallet is credited once per code.
 */
export function VoucherEntry({
  region,
  variant,
}: {
  region: string;
  variant: 'header' | 'drawer';
}) {
  // Shell furniture: the dialog lives in the header and the drawer, so its
  // copy rides with `common` — the one namespace every page already has.
  const t = useTranslations('common');
  const { member, currency } = useSession();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [issue, setIssue] = useState<VoucherIssue | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState<{ state: ListState; vouchers: VoucherInfoRow[] }>({
    state: 'idle',
    vouchers: [],
  });

  const load = useCallback(async () => {
    setList((current) => ({ state: 'loading', vouchers: current.vouchers }));
    try {
      const response = await fetch('/api/vouchers', { cache: 'no-store' });
      const body = (await response.json()) as { d?: unknown };
      setList({ state: 'ready', vouchers: vouchersInfoSchema.parse(body?.d).vouchers });
    } catch {
      setList({ state: 'error', vouchers: [] });
    }
  }, []);

  useEffect(() => {
    if (open && member) {
      void load();
    } else if (!open) {
      setList({ state: 'idle', vouchers: [] });
    }
  }, [open, member, load]);

  function close() {
    setOpen(false);
    setOutcome(null);
    setIssue(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const found = voucherCodeIssue(code);
    setIssue(found);
    if (found) return;
    if (!member) {
      setOutcome({ kind: 'guest' });
      return;
    }

    setBusy(true);
    try {
      const response = await fetch('/api/vouchers/redeem', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), idempotencyKey: crypto.randomUUID() }),
      });
      const payload = (await response.json()) as { status?: string; d?: RedeemedVoucher | null };
      if (payload?.status !== '0' || !payload.d) {
        const status = payload?.status ?? String(response.status);
        if (status === '404') setOutcome({ kind: 'invalid' });
        else if (status === '409') setOutcome({ kind: 'already' });
        else if (status === '410') setOutcome({ kind: 'not-redeemable' });
        else if (status === '411') setOutcome({ kind: 'finished' });
        else setOutcome({ kind: 'error' });
        return;
      }

      await creditVoucher(payload.d, {
        labels: { promoType: t('voucher.promoType', { code: payload.d.code }) },
        credit: (amountMinor, key) => walletService.deposit(amountMinor, key),
      });
      setOutcome({
        kind: 'success',
        code: payload.d.code,
        amountMinor: payload.d.amountMinor,
        left: payload.d.left,
      });
      setCode('');
      await load();
    } catch {
      setOutcome({ kind: 'error' });
    } finally {
      setBusy(false);
    }
  }

  const money = (minor: number) => formatMinor(minor, currency || 'MYR');

  const trigger =
    variant === 'header' ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-voucher="header"
        aria-label={t('voucher.title')}
        title={t('voucher.title')}
        className="border-line text-ink hover:border-accent hover:text-accent grid size-[41px] place-items-center rounded-[15px] border text-xs font-medium"
      >
        <span className="text-accent">&#9670;</span>
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-voucher="drawer"
        className="drawer-row active:bg-panel-soft w-full text-left"
      >
        <Icon name="gift" size={20} className="text-accent me-[30px] shrink-0" />
        {t('voucher.title')}
      </button>
    );

  return (
    <>
      {trigger}

      <Modal open={open} onClose={close} variant="status" title={t('voucher.title')} portal>
        <form onSubmit={submit} noValidate className="account-voucher__modal" data-voucher-form>
          <label htmlFor="voucherInput" className="voucher-modal__label">
            {t('voucher.codeLabel')}
          </label>
          <input
            id="voucherInput"
            name="code"
            className="form-control voucher-modal__input"
            value={code}
            autoComplete="off"
            spellCheck={false}
            placeholder={t('voucher.placeholder')}
            aria-invalid={issue !== null}
            aria-describedby={issue ? 'voucher-issue' : undefined}
            onChange={(event) => {
              setCode(event.target.value);
              setIssue(null);
              setOutcome(null);
            }}
          />

          {issue ? (
            <p className="voucher-modal__error" id="voucher-issue" role="alert">
              {t(issue === 'required' ? 'voucher.emptyCode' : 'voucher.formatCode')}
            </p>
          ) : null}

          {outcome?.kind === 'guest' ? (
            <p
              className="voucher-modal__result voucher-modal__result--notice"
              role="status"
              data-testid="voucher-result"
              data-outcome="guest"
            >
              {t('voucher.guestNotice')}{' '}
              <Link href={`/${region}/login`} className="underline">
                {t('voucher.guestAction')}
              </Link>
            </p>
          ) : null}

          {outcome?.kind === 'success' ? (
            <div
              className="voucher-modal__result voucher-modal__result--success"
              role="status"
              data-testid="voucher-result"
              data-outcome="success"
            >
              <p>{t('voucher.resultSuccess')}</p>
              <p>{t('voucher.resultCredited', { amount: money(outcome.amountMinor) })}</p>
              <p>{t('voucher.leftCount', { count: outcome.left })}</p>
            </div>
          ) : null}

          {outcome && FAILURE_KEYS[outcome.kind as FailureKind] ? (
            <p
              className="voucher-modal__result voucher-modal__result--error"
              role="status"
              data-testid="voucher-result"
              data-outcome={outcome.kind}
            >
              {t(FAILURE_KEYS[outcome.kind as FailureKind])}
            </p>
          ) : null}

          <div className="voucher-modal__tip-wrapper">
            <ol className="info-content">
              <li>{t('voucher.tipVerify')}</li>
              <li>{t('voucher.tipName')}</li>
            </ol>
          </div>

          <p className="voucher-modal__hint">{t('voucher.demoHint', { codes: DEMO_CODES })}</p>

          <div className="account-voucher__modal-btn">
            <PrimaryButton type="submit" className="w-full" disabled={busy}>
              {t('action.submit')}
            </PrimaryButton>
          </div>
        </form>

        {member ? (
          <section className="voucher-wallet" data-state={list.state} data-testid="voucher-wallet">
            <h4 className="voucher-wallet__title">
              {t('voucher.walletTitle')}
              <span className="voucher-wallet__note">{t('demoData')}</span>
            </h4>

            {list.state === 'loading' ? (
              <p className="voucher-wallet__state" aria-busy="true">
                {t('state.loading')}
              </p>
            ) : null}

            {list.state === 'error' ? (
              <>
                <p className="voucher-wallet__state">{t('voucher.walletError')}</p>
                <button type="button" className="voucher-wallet__retry" onClick={() => void load()}>
                  {t('action.retry')}
                </button>
              </>
            ) : null}

            {list.state === 'ready' && list.vouchers.length === 0 ? (
              <p className="voucher-wallet__state">{t('voucher.walletEmpty')}</p>
            ) : null}

            {list.state === 'ready' && list.vouchers.length > 0 ? (
              <div className="voucher-wallet__table-wrapper">
                <table className="table-theme voucher-wallet__table">
                  <thead>
                    <tr>
                      <th>{t('voucher.columnCode')}</th>
                      <th>{t('voucher.columnAmount')}</th>
                      <th>{t('voucher.columnRedeemed')}</th>
                      <th>{t('voucher.columnStatus')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.vouchers.map((row) => (
                      <tr
                        key={row.id}
                        data-testid="voucher-row"
                        data-code={row.code}
                        data-status={row.status}
                      >
                        <td>{row.code}</td>
                        <td>{money(row.amountMinor)}</td>
                        <td>{formatDate(row.redeemedAt)}</td>
                        <td>
                          {t(
                            row.status === 'active'
                              ? 'voucher.statusActive'
                              : 'voucher.statusExpired',
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        ) : null}
      </Modal>
    </>
  );
}

/** Codes the mock catalogue hands out, for the demo hint (MOCK-ONLY). */
const DEMO_CODES = 'WELCOME188 · VOUCHER50';

type FailureKind = 'invalid' | 'already' | 'not-redeemable' | 'finished' | 'error';

/** The reference's own dictionary for the four rejections, plus our retry line. */
const FAILURE_KEYS: Record<FailureKind, string> = {
  invalid: 'voucher.resultInvalid',
  already: 'voucher.resultRedeemed',
  'not-redeemable': 'voucher.resultNotRedeemable',
  finished: 'voucher.resultFinished',
  error: 'voucher.resultError',
};

/** The redemption the redeem route answers with. */
type RedeemedVoucher = {
  id: string;
  code: string;
  amountMinor: number;
  expiresAt: string;
  redeemedAt: string;
  left: number;
};

type Outcome =
  | { kind: 'guest' }
  | { kind: 'success'; code: string; amountMinor: number; left: number }
  | { kind: FailureKind };

type ListState = 'idle' | 'loading' | 'error' | 'ready';
