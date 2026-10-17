'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { LaunchGateModal } from '@/components/game/LaunchGateModal';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { RulesButton } from '@/components/ui/RulesButton';
import { formatMinor, formatMinorPlain, formatMinorToInput, parseAmountMinor } from '@/lib/format';
import { sessionGate, type LaunchGate } from '@/lib/game/launch-gate';
import { useSession } from '@/lib/session/useSession';
import {
  MAX_PICKS,
  MAX_STAKE_MINOR,
  MIN_STAKE_MINOR,
  isPicked,
  pickedOptionOf,
  slipSummary,
  stakeIssue,
  togglePick,
  type Pick,
} from '@/lib/prediction-rules';
import {
  PredictionError,
  newBetKey,
  placePrediction,
  type PlacedPredictionBet,
} from '@/lib/prediction-bet';
import type { PredictionFixture } from '@/lib/api/schemas';

/** The store's rejection codes, and the wallet's two, as message keys. */
const ERROR_KEYS: Record<string, string> = {
  '210': 'prediction.errors.amountMin',
  '211': 'prediction.errors.amountMax',
  '212': 'prediction.errors.noPicks',
  '213': 'prediction.errors.tooManyPicks',
  '214': 'prediction.errors.unknownFixture',
  '215': 'prediction.errors.closed',
  '216': 'prediction.errors.unknownOption',
  credit: 'prediction.errors.credit',
  network: 'prediction.errors.network',
};

type TicketsState = 'loading' | 'error' | 'empty' | 'ready';

/** The reference's own card modifiers; our fixture's `active` is its `in-progress`. */
const CARD_MOD: Record<PredictionFixture['status'], string> = {
  active: 'pd-card--in-progress',
  upcoming: 'pd-card--upcoming',
  ended: 'pd-card--ended',
};

/**
 * The prediction board: the fixture cards open the reference's pick dialog
 * (`pd-select__container` inside a modal — the reference's slip chunk was never
 * captured, so the dialog is built from its stylesheet), the picks collect in the
 * slip below the list, and SUBMIT is the two-sided mock T67 established — the
 * server accepts the slip once (the idempotency key is minted per slip, so a
 * double submit replays), then the browser takes the stake out of the main wallet
 * once (`pd:<betId>`) and mirrors the ticket into the history page.
 */
export function PredictionBoard({
  fixtures,
  region,
  symbol,
}: {
  fixtures: PredictionFixture[];
  region: string;
  symbol: string;
}) {
  const t = useTranslations('games');
  const tCommon = useTranslations('common');
  const session = useSession();
  const money = (minor: number) => `${symbol} ${formatMinorPlain(minor)}`;

  const [picks, setPicks] = useState<Pick[]>([]);
  const [amountText, setAmountText] = useState(() => formatMinorToInput(MIN_STAKE_MINOR));
  const [amountError, setAmountError] = useState<string | null>(null);
  const [slipError, setSlipError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<{ variant: 'success' | 'error'; titleKey: string } | null>(
    null,
  );
  const [bodyKey, setBodyKey] = useState('prediction.placedBody');
  const [dialog, setDialog] = useState<PredictionFixture | null>(null);
  const [dialogOption, setDialogOption] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ gate: LaunchGate; here: string } | null>(null);
  const [tickets, setTickets] = useState<PlacedPredictionBet[] | null>(null);
  const [ticketsFailed, setTicketsFailed] = useState(false);
  // One key per slip: a double submit asks the server to replay, never to book twice.
  const keyRef = useRef(newBetKey());

  const loadTickets = useCallback(async () => {
    setTicketsFailed(false);
    setTickets(null);
    try {
      const response = await fetch('/api/prediction/bets');
      const body = (await response.json()) as { status: string; d: { bets: PlacedPredictionBet[] } };
      if (body.status !== '0') throw new Error(body.status);
      setTickets(body.d.bets);
    } catch {
      setTicketsFailed(true);
    }
  }, []);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const ticketsState: TicketsState = ticketsFailed
    ? 'error'
    : tickets === null
      ? 'loading'
      : tickets.length === 0
        ? 'empty'
        : 'ready';

  const amountMinor = parseAmountMinor(amountText);
  const oddsOf = (pick: Pick): number | null => {
    const fixture = fixtures.find((entry) => entry.id === pick.fixtureId);
    return fixture?.options.find((option) => option.id === pick.optionId)?.odds ?? null;
  };
  const summary = slipSummary(picks, amountMinor, oddsOf);

  const pickRow = (pick: Pick) => {
    const fixture = fixtures.find((entry) => entry.id === pick.fixtureId);
    const option = fixture?.options.find((entry) => entry.id === pick.optionId);
    return { fixture, option };
  };

  /** One card or dialog click; a refused click is the slip's own message. */
  const choose = (fixtureId: string, optionId: string) => {
    const next = togglePick(picks, { fixtureId, optionId });
    if (next.refused) {
      setSlipError('prediction.errors.tooManyPicks');
      return;
    }
    setSlipError(null);
    setPicks(next.picks);
  };

  const openDialog = (fixture: PredictionFixture) => {
    setDialogOption(pickedOptionOf(picks, fixture.id));
    setDialog(fixture);
  };

  /** The dialog's SUBMIT: keep the pick (a dialog confirm never removes one). */
  const confirmDialog = () => {
    if (dialog && dialogOption && !isPicked(picks, dialog.id, dialogOption)) {
      choose(dialog.id, dialogOption);
    }
    setDialog(null);
  };

  const submit = async () => {
    // SUBMIT books a slip, so only the session half of the launch gate answers:
    // a guest is asked to sign in, a member with an empty wallet to top up.
    const gate = sessionGate({
      ready: session.ready,
      member: session.member,
      balanceMinor: session.balanceMinor,
    });
    if (gate) {
      setNotice({ gate, here: `${window.location.pathname}${window.location.search}` });
      return;
    }

    const issue = stakeIssue(amountMinor);
    if (issue) {
      setAmountError(
        issue === 'required'
          ? 'prediction.errors.amountRequired'
          : issue === 'min'
            ? 'prediction.errors.amountMin'
            : 'prediction.errors.amountMax',
      );
      return;
    }
    if (picks.length === 0) {
      setBodyKey('prediction.errors.noPicks');
      setOutcome({ variant: 'error', titleKey: 'prediction.failedTitle' });
      return;
    }

    setAmountError(null);
    setSubmitting(true);
    try {
      await placePrediction({
        picks,
        amountMinor: amountMinor as number,
        idempotencyKey: keyRef.current,
      });
      keyRef.current = newBetKey();
      setPicks([]);
      setBodyKey('prediction.placedBody');
      setOutcome({ variant: 'success', titleKey: 'prediction.placedTitle' });
      await session.refresh();
      void loadTickets();
    } catch (error) {
      setBodyKey(
        error instanceof PredictionError ? ERROR_KEYS[error.code] : ERROR_KEYS.network,
      );
      setOutcome({ variant: 'error', titleKey: 'prediction.failedTitle' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-testid="prediction-board">
      <ul className="pd-card-list">
        {fixtures.map((fixture) => {
          const ended = fixture.status === 'ended';
          return (
            <li key={fixture.id}>
              <article
                data-fixture={fixture.id}
                className={`pd-card ${CARD_MOD[fixture.status]}`}
              >
                <div className="pd-card__head">
                  <span aria-hidden className="pd-card__avatar pd-card__league">
                    {fixture.league}
                  </span>
                  <div className="pd-card__meta">
                    <p className="pd-card__title">
                      {fixture.home}{' '}
                      <span className="text-muted font-normal">{t('prediction.vs')}</span>{' '}
                      {fixture.away}
                    </p>
                    <p className="pd-card__sub">
                      {fixture.startsAt.slice(0, 16).replace('T', ' ')} (+08:00)
                    </p>
                  </div>
                  <span className="pd-card__pill">
                    {fixture.status === 'ended'
                      ? t('prediction.ended')
                      : t(`prediction.tab.${fixture.status}`)}
                  </span>
                </div>

                <div className="pd-card__stats">
                  <div className="pd-card__stat">
                    {t('prediction.prizePool')}
                    <strong className="pd-card__stat-value">
                      {formatMinor(fixture.prizePoolMinor, 'USD', 'en-MY', { compact: true })}
                    </strong>
                  </div>
                  <div className="pd-card__stat pd-card__stat--divided">
                    {t('prediction.entry')}
                    <strong className="pd-card__stat-value">{t('prediction.free')}</strong>
                  </div>
                </div>

                <div className="pd-card__odds">
                  {fixture.options.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`pd-card__odd${isPicked(picks, fixture.id, option.id) ? ' selected' : ''}`}
                      aria-pressed={isPicked(picks, fixture.id, option.id)}
                      aria-label={t('prediction.optionAria', {
                        home: fixture.home,
                        away: fixture.away,
                        option: option.label,
                      })}
                      disabled={ended}
                      onClick={() => choose(fixture.id, option.id)}
                    >
                      <span>{option.label}</span>
                      <span className="pd-card__odd-value">{option.odds.toFixed(2)}</span>
                    </button>
                  ))}
                </div>

                <div className="pd-card__actions">
                  <button
                    type="button"
                    className={`pd-card__btn pd-card__btn--primary${ended ? ' pd-card__btn--disabled' : ''}`}
                    disabled={ended}
                    onClick={() => openDialog(fixture)}
                  >
                    {t('prediction.betNow')}
                  </button>
                  <RulesButton
                    className="pd-card__btn pd-card__btn--rules"
                    title={t('prediction.rulesTitle')}
                    body={t('prediction.rules')}
                  />
                </div>
              </article>
            </li>
          );
        })}
      </ul>

      <section className="pd-slip" data-testid="prediction-slip">
        <h2 className="pd-slip__title">{t('prediction.slipTitle')}</h2>
        {picks.length === 0 ? (
          <p className="pd-slip__note">{t('prediction.slipEmpty')}</p>
        ) : (
          <ul className="pd-slip__list">
            {picks.map((pick) => {
              const { fixture, option } = pickRow(pick);
              if (!fixture || !option) return null;
              return (
                <li key={`${pick.fixtureId}:${pick.optionId}`} className="pd-slip__row">
                  <span className="pd-slip__fixture">
                    {fixture.league} · {fixture.home} {t('prediction.vs')} {fixture.away}
                  </span>
                  <span className="pd-slip__pick">
                    {option.label} <strong>{option.odds.toFixed(2)}</strong>
                  </span>
                  <button
                    type="button"
                    className="pd-slip__remove"
                    aria-label={t('prediction.removeAria', {
                      home: fixture.home,
                      away: fixture.away,
                      option: option.label,
                    })}
                    onClick={() => choose(pick.fixtureId, pick.optionId)}
                  >
                    {t('prediction.remove')}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <label className="pd-slip__label" htmlFor="pd-stake">
          {t('prediction.stake')}
        </label>
        <input
          id="pd-stake"
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
        <p className="pd-slip__hint">
          {t('prediction.min')} {money(MIN_STAKE_MINOR)} · {t('prediction.max')}{' '}
          {money(MAX_STAKE_MINOR)} · {t('prediction.maxPicks', { count: MAX_PICKS })}
        </p>
        {amountError ? (
          <p role="alert" className="deposit-error">
            {t(amountError)}
          </p>
        ) : null}
        {slipError ? (
          <p role="alert" className="deposit-error">
            {t(slipError)}
          </p>
        ) : null}
        <p className="pd-slip__figures">
          <span>{t('prediction.picksCount')}</span>: {summary.picks} ·{' '}
          <span>{t('prediction.total')}</span>: {money(summary.totalMinor)} ·{' '}
          <span>{t('prediction.potential')}</span>: {money(summary.potentialMinor)}
        </p>

        <p className="pd-slip__credit">
          <span>{t('prediction.currentCredit')}</span>: {money(session.balanceMinor)}
        </p>

        <button
          type="button"
          className="pd-card__btn pd-card__btn--primary pd-slip__submit"
          disabled={submitting}
          onClick={() => void submit()}
        >
          {t('prediction.submit')}
        </button>
      </section>

      <section
        className="pd-tickets"
        data-testid="prediction-tickets"
        data-state={ticketsState}
      >
        <h2 className="pd-tickets__title">{t('prediction.tickets')}</h2>
        {ticketsState === 'loading' ? (
          <p className="pd-tickets__note">{tCommon('state.loading')}</p>
        ) : null}
        {ticketsState === 'error' ? (
          <>
            <p role="alert" className="deposit-error">
              {t('prediction.errors.network')}
            </p>
            <button type="button" className="btn btn-normal" onClick={() => void loadTickets()}>
              {tCommon('action.retry')}
            </button>
          </>
        ) : null}
        {ticketsState === 'empty' ? (
          <p className="pd-tickets__note">{t('prediction.noTickets')}</p>
        ) : null}
        {ticketsState === 'ready' ? (
          <table className="table-theme pd-tickets__table">
            <thead>
              <tr>
                <th>{t('prediction.col.fixture')}</th>
                <th>{t('prediction.col.pick')}</th>
                <th>{t('prediction.col.placedAt')}</th>
                <th>{t('prediction.col.total')}</th>
              </tr>
            </thead>
            <tbody>
              {(tickets ?? []).map((ticket) => (
                <tr key={ticket.id}>
                  <td>
                    {ticket.picks
                      .map((pick) => `${pick.home} ${t('prediction.vs')} ${pick.away}`)
                      .join(' · ')}
                  </td>
                  <td>{ticket.picks.map((pick) => `${pick.label} ${pick.odds.toFixed(2)}`).join(' · ')}</td>
                  <td>{ticket.placedAt.slice(0, 16).replace('T', ' ')}</td>
                  <td>{money(ticket.totalMinor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>

      <Modal
        open={dialog !== null}
        onClose={() => setDialog(null)}
        variant="message"
        title={t('prediction.pickTitle')}
        actions={
          <button
            type="button"
            className="btn btn-primary pd-mobile__btn-submit"
            data-testid="prediction-pick-submit"
            disabled={dialogOption === null}
            onClick={confirmDialog}
          >
            {t('prediction.submit')}
          </button>
        }
      >
        {dialog ? (
          <div data-testid="prediction-pick-dialog">
            <p className="pd-select-team">
              {dialog.home} {t('prediction.vs')} {dialog.away} · {dialog.league}
            </p>
            <p className="pd-drag-select">{t('prediction.pickHint')}</p>
            <div className="pd-select__container" role="group" aria-label={t('prediction.pickTitle')}>
              {dialog.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`pd-select-team${dialogOption === option.id ? ' selected' : ''}`}
                  aria-pressed={dialogOption === option.id}
                  onClick={() => setDialogOption(option.id)}
                >
                  <span>{option.label}</span>
                  <span className="pd-select-team__odds">{option.odds.toFixed(2)}</span>
                </button>
              ))}
            </div>
            <p className="pd-select__info-icon_wrapper">
              <Icon name="info" size={14} />
              <span className="pd-select-info-msg">{t('prediction.oddsNote')}</span>
            </p>
          </div>
        ) : null}
      </Modal>

      {notice ? (
        <LaunchGateModal
          gate={notice.gate}
          region={region}
          here={notice.here}
          onClose={() => setNotice(null)}
        />
      ) : null}

      <Modal
        open={outcome !== null}
        onClose={() => setOutcome(null)}
        variant={outcome?.variant ?? 'success'}
        title={t(outcome?.titleKey ?? 'prediction.placedTitle')}
      >
        <p>{t(bodyKey)}</p>
      </Modal>
    </div>
  );
}
