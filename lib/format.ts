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

/** "2026-10-14T09:00:00+08:00" -> "2026-10-14 09:00". */
export function formatTimestamp(value: string): string {
  return value.slice(0, 16).replace('T', ' ');
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
