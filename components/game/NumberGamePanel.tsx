'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Modal } from '@/components/ui/Modal';
import { formatMinorPlain, formatMinorToInput, parseAmountMinor } from '@/lib/format';
import { BetError, newBetKey, placeBet, type PlacedBet } from '@/lib/numbergame-bet';
import {
  MAX_BET_MINOR,
  MAX_LINES,
  MIN_BET_MINOR,
  NUMBERS,
  amountIssue,
  completeLines,
  lineKey,
  randomLines,
  slipSummary,
  toggleNumberInLines,
} from '@/lib/numbergame-rules';
import { useSession } from '@/lib/session/useSession';

/** The store's rejection codes, and the wallet's two, as message keys. */
const ERROR_KEYS: Record<string, string> = {
  '210': 'numberGame.errors.amountMin',
  '211': 'numberGame.errors.amountMax',
  '212': 'numberGame.errors.needSix',
  '213': 'numberGame.errors.tooManyLines',
  credit: 'numberGame.errors.credit',
  network: 'numberGame.errors.network',
};

type BetsState = 'loading' | 'error' | 'empty' | 'ready';
type Mode = 'manual' | 'auto';

/**
 * The slip itself: the six-of-49 dial, up to two lines, the stake, the total and
 * the submit — plus the member's own bets underneath. The reference renders all
 * of this from a chunk that was never captured, so the dial is built from its
 * stylesheet (`.ng-spin__manual-add` / `.ng-spin__manual-pill`, the ≤768
 * `.ng-spin__body .nav-pill__wrapper` grid) and the rules in `numberGame.rules`.
 *
 * Submitting is the two-sided mock: the server accepts the slip once (the
 * idempotency key is minted per slip, so a double submit replays), then the
 * browser takes the stake out of the main wallet once (`ng:<betId>`) and mirrors
 * the bet into the history page.
 */
export function NumberGamePanel({ symbol }: { symbol: string }) {
  const t = useTranslations('games');
  const tCommon = useTranslations('common');
  const session = useSession();
  const money = (minor: number) => `${symbol} ${formatMinorPlain(minor)}`;

  const [mode, setMode] = useState<Mode>('manual');
  const [lines, setLines] = useState<number[][]>([[]]);
  const [amountText, setAmountText] = useState(() => formatMinorToInput(MIN_BET_MINOR));
  const [amountError, setAmountError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<{ variant: 'success' | 'error'; titleKey: string } | null>(
    null,
  );
  const [bodyKey, setBodyKey] = useState('numberGame.placedBody');
  const [bets, setBets] = useState<PlacedBet[] | null>(null);
  const [betsFailed, setBetsFailed] = useState(false);
  // One key per slip: a double submit asks the server to replay, never to book twice.
  const keyRef = useRef(newBetKey());

  const loadBets = useCallback(async () => {
    setBetsFailed(false);
    setBets(null);
    try {
      const response = await fetch('/api/numbergame/bets');
      const body = (await response.json()) as { status: string; d: { bets: PlacedBet[] } };
      if (body.status !== '0') throw new Error(body.status);
      setBets(body.d.bets);
    } catch {
      setBetsFailed(true);
    }
  }, []);

  useEffect(() => {
    void loadBets();
  }, [loadBets]);

  const betsState: BetsState = betsFailed
    ? 'error'
    : bets === null
      ? 'loading'
      : bets.length === 0
        ? 'empty'
        : 'ready';

  const amountMinor = parseAmountMinor(amountText);
  const summary = slipSummary(lines, amountMinor);
  const picked = new Set(lines.flat());

  const toggle = (value: number) => setLines((current) => toggleNumberInLines(current, value));
  const fill = () => setLines(randomLines(MAX_LINES));
  const clear = () => setLines([[]]);

  const submit = async () => {
    const issue = amountIssue(amountMinor);
    if (issue) {
      setAmountError(
        issue === 'required'
          ? 'numberGame.errors.amountRequired'
          : issue === 'min'
            ? 'numberGame.errors.amountMin'
            : 'numberGame.errors.amountMax',
      );
      return;
    }
    if (summary.bets === 0) {
      setBodyKey('numberGame.errors.needSix');
      setOutcome({ variant: 'error', titleKey: 'numberGame.failedTitle' });
      return;
    }

    setAmountError(null);
    setSubmitting(true);
    try {
      await placeBet({
        lines: completeLines(lines),
        amountMinor: amountMinor as number,
        idempotencyKey: keyRef.current,
      });
      keyRef.current = newBetKey();
      setLines([[]]);
      setBodyKey('numberGame.placedBody');
      setOutcome({ variant: 'success', titleKey: 'numberGame.placedTitle' });
      await session.refresh();
      void loadBets();
    } catch (error) {
      setBodyKey(error instanceof BetError ? ERROR_KEYS[error.code] : ERROR_KEYS.network);
      setOutcome({ variant: 'error', titleKey: 'numberGame.failedTitle' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ng-spin__wrapper" data-testid="numbergame-panel">
      <div className="ng-spin__header" role="group" aria-label={t('numberGame.tabs')}>
        {(['manual', 'auto'] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={mode === option}
            className={`nav-pill${mode === option ? ' selected' : ''}`}
            onClick={() => setMode(option)}
          >
            {t(`numberGame.${option}`)}
          </button>
        ))}
      </div>

      {mode === 'manual' ? (
        <>
          <p className="ng-spin__pick-hint">{t('numberGame.pickHint')}</p>
          <div className="ng-spin__body">
            <div className="nav-pill__wrapper" data-testid="numbergame-dial">
              {NUMBERS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className="nav-pill"
                  aria-pressed={picked.has(value)}
                  aria-label={String(value)}
                  onClick={() => toggle(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div className="ng-spin__manual-grid" data-testid="numbergame-lines">
            {Array.from({ length: MAX_LINES }, (_, index) => {
              const line = lines[index];
              return line && line.length > 0 ? (
                <div key={index} className="ng-spin__manual-pill">
                  {lineKey(line)}
                </div>
              ) : (
                <div key={index} className="ng-spin__manual-add" aria-hidden="true" />
              );
            })}
          </div>
        </>
      ) : (
        <div className="ng-spin__auto-wrapper" data-testid="numbergame-auto">
          {lines.map((line, index) => (
            <div key={index} className="ng-spin__auto-pill">
              <span className="ng-spin__auto-index">{index + 1}</span>
              <span>{lineKey(line)}</span>
            </div>
          ))}
        </div>
      )}

      <p className="ng-spin__available-ticket">
        <span>{t('numberGame.availableTicket')}</span>: {MAX_LINES - lines.length}
      </p>
      <p className="ng-spin__current-credit">
        <span>{t('numberGame.currentCredit')}</span>: {money(session.balanceMinor)}
      </p>

      <div className="ng-spin__actions">
        <button type="button" className="btn btn-primary mr-7" onClick={fill}>
          {mode === 'manual' ? t('numberGame.random') : t('numberGame.generate')}
        </button>
        <button type="button" className="btn btn-normal" onClick={clear}>
          {t('numberGame.reset')}
        </button>
      </div>

      <div className="ng-betslip">
        <label className="ng-betslip__label" htmlFor="ng-amount">
          {t('numberGame.betAmount')}
        </label>
        <input
          id="ng-amount"
          className="form-control"
          inputMode="decimal"
          autoComplete="off"
          value={amountText}
          aria-invalid={amountError ? true : undefined}
          onChange={(event) => {
            setAmountText(event.target.value);
            setAmountError(null);
          }}
        />
        <p className="ng-betslip__hint">
          {money(MIN_BET_MINOR)} – {money(MAX_BET_MINOR)}
        </p>
        {amountError ? (
          <p role="alert" className="deposit-error">
            {t(amountError)}
          </p>
        ) : null}
        <p className="ng-betslip__figures">
          <span>{t('numberGame.betsCount')}</span>: {summary.bets} ·{' '}
          <span>{t('numberGame.totalAmount')}</span>: {money(summary.totalMinor)}
        </p>
      </div>

      <button
        type="button"
        className="btn btn-primary ng-spin__submit"
        disabled={submitting}
        onClick={() => void submit()}
      >
        {t('numberGame.submit')}
      </button>

      <section className="ng-bets" data-testid="numbergame-bets" data-state={betsState}>
        <h3 className="ng-bets__title">{t('numberGame.myBets')}</h3>
        {betsState === 'loading' ? (
          <p className="ng-bets__note">{tCommon('state.loading')}</p>
        ) : null}
        {betsState === 'error' ? (
          <>
            <p role="alert" className="deposit-error">
              {t('numberGame.errors.network')}
            </p>
            <button type="button" className="btn btn-normal" onClick={() => void loadBets()}>
              {tCommon('action.retry')}
            </button>
          </>
        ) : null}
        {betsState === 'empty' ? <p className="ng-bets__note">{t('numberGame.noBets')}</p> : null}
        {betsState === 'ready' ? (
          <table className="table-theme ng-bets__table">
            <thead>
              <tr>
                <th>{t('numberGame.col.numbers')}</th>
                <th>{t('numberGame.col.drawnAt')}</th>
                <th>{t('numberGame.totalAmount')}</th>
              </tr>
            </thead>
            <tbody>
              {(bets ?? []).map((bet) => (
                <tr key={bet.id}>
                  <td>{bet.lines.map((line) => lineKey(line)).join(' / ')}</td>
                  <td>{bet.placedAt.slice(0, 16).replace('T', ' ')}</td>
                  <td>{money(bet.totalMinor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>

      <Modal
        open={outcome !== null}
        onClose={() => setOutcome(null)}
        variant={outcome?.variant ?? 'success'}
        title={t(outcome?.titleKey ?? 'numberGame.placedTitle')}
      >
        <p>{t(bodyKey)}</p>
      </Modal>
    </div>
  );
}
