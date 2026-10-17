/**
 * Money and date rendering. Amounts stay integer minor units (cents) everywhere
 * in the app; the division by 100 happens here and nowhere else, so a float never
 * enters a total.
 */
export function formatMinor(
  amountMinor: number,
  currency: string,
  intlTag = 'en-MY',
  { compact = false }: { compact?: boolean } = {},
): string {
  const value = amountMinor / 100;
  try {
    return new Intl.NumberFormat(intlTag, {
      style: 'currency',
      currency,
      minimumFractionDigits: compact ? 0 : 2,
      maximumFractionDigits: compact ? 0 : 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(compact ? 0 : 2)}`;
  }
}

/** "1,234.50" — the number without a currency symbol, for places that print the code separately. */
export function formatMinorPlain(amountMinor: number, intlTag = 'en-MY'): string {
  return (amountMinor / 100).toLocaleString(intlTag, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Parses a typed amount ("1,234.5") into integer minor units without float math.
 * Returns null for anything that is not a plain amount with at most two decimals.
 */
export function parseAmountMinor(input: string): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(input.replace(/,/g, '').trim());
  if (!match) return null;
  const minor = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return Number.isSafeInteger(minor) ? minor : null;
}

/**
 * Re-renders what is being typed into an amount field: digits only, thousands
 * separators in the integer part and at most two decimals ("1234.5" -> "1,234.5").
 * Anything else is dropped as it is typed, so the field never holds a figure
 * `parseAmountMinor` would refuse.
 */
export function formatAmountInput(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, '');
  const [head, ...rest] = cleaned.split('.');
  const grouped = head.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (rest.length === 0) return grouped;
  return `${grouped === '' ? '0' : grouped}.${rest.join('').slice(0, 2)}`;
}

/** 5000 -> "50", 5050 -> "50.50": the plain figure an amount input shows. */
export function formatMinorToInput(amountMinor: number): string {
  const units = Math.trunc(amountMinor / 100);
  const cents = amountMinor % 100;
  return cents === 0 ? String(units) : `${units}.${String(cents).padStart(2, '0')}`;
}

/**
 * The quick-pick amounts of a deposit method (reference
 * `.deposit-amount__selection-pill`): a 1/2/10/20/100 ladder off the minimum,
 * kept inside the method's own limits. The reference's own picks live in the
 * page JS that was never captured, so the ladder is ours.
 */
export function quickAmounts(minMinor: number, maxMinor: number): number[] {
  return [1, 2, 10, 20, 100]
    .map((factor) => minMinor * factor)
    .filter((amountMinor) => amountMinor <= maxMinor);
}

/** "2026-10-14T09:00:00+08:00" -> "2026-10-14 09:00". */
export function formatTimestamp(value: string): string {
  return value.slice(0, 16).replace('T', ' ');
}

/** The mock gateway's session clock: "14:59" (mm:ss, floored, never negative). */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** "2026-10-14T09:00:00+08:00" -> "14 Oct 2026, 09:00". */
export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Singapore',
  }).format(date);
}

/** "2026-10-13" or a timestamp -> "13 Oct 2026" (no time — for a day period). */
export function formatDay(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Singapore',
  }).format(date);
}
