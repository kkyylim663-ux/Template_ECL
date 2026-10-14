'use client';

import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import type { VipLevel, VipPrivilegeGroup } from '@/lib/api';

/**
 * VIP tier track and its `vip-table__wrapper` matrix: privilege rows run across
 * the five tiers. Selecting a marker highlights that tier's column and swaps the
 * benefits panel below — one panel, five states, no navigation.
 */
export function VipTierTrack({
  levels,
  currency,
  privileges,
  benefits,
}: {
  levels: VipLevel[];
  currency: string;
  /** Privilege rows from the mock; the upgrade row is derived from thresholds. */
  privileges: VipPrivilegeGroup[];
  /** Rendered server-side: the selected tier's benefits are React nodes. */
  benefits: Record<string, ReactNode>;
}) {
  const t = useTranslations('content');
  const [activeId, setActiveId] = useState(levels[0]?.id ?? '');
  const active = levels.find((level) => level.id === activeId) ?? levels[0];

  if (!active) return null;

  const money = (amountMinor: number) =>
    new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amountMinor / 100);

  // The upgrade row is the tier track as one line of the matrix; deriving it
  // keeps the thresholds in a single place (mocks/vip.json).
  const upgradeGroup: VipPrivilegeGroup = {
    id: 'upgrade',
    label: t('vip.groupUpgrade'),
    rows: [
      {
        id: 'turnover',
        label: t('vip.rowTurnover'),
        values: Object.fromEntries(
          levels.map((level) => [
            level.id,
            level.thresholdMinor > 0
              ? t('vip.threshold', { amount: money(level.thresholdMinor) })
              : t('vip.thresholdEntry'),
          ]),
        ),
      },
    ],
  };
  const groups = [upgradeGroup, ...privileges];

  const columnCell = (levelId: string) =>
    levelId === active.id ? 'bg-panel-soft text-ink' : 'text-muted';

  return (
    <div data-part="vip-tier-track">
      <ol className="mt-5 grid grid-cols-2 gap-3 desktop:grid-cols-5">
        {levels.map((level) => {
          const selected = level.id === active.id;
          return (
            <li key={level.id}>
              <button
                type="button"
                onClick={() => setActiveId(level.id)}
                aria-pressed={selected}
                data-vip-tier={level.id}
                className={`h-full w-full rounded-[var(--radius-panel)] border p-3 text-left transition-colors ${
                  selected
                    ? 'border-accent bg-panel-soft'
                    : 'border-line bg-panel hover:border-accent'
                }`}
              >
                {/* Marker + connector, mirroring `vip-tier-track__marker`. */}
                <span
                  aria-hidden
                  className={`block size-2.5 rounded-full ${selected ? 'bg-accent' : 'bg-line-strong'}`}
                />
                <span className="text-ink mt-2 block text-sm font-semibold">{level.name}</span>
                <span className="text-muted mt-0.5 block text-[11px]">{level.short}</span>
                <span className="text-accent mt-2 block font-mono text-xs">
                  {level.thresholdMinor > 0
                    ? t('vip.threshold', { amount: money(level.thresholdMinor) })
                    : t('vip.thresholdEntry')}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* `vip-table__wrapper`: rows are privileges, columns are tiers. */}
      <div className="mt-5 overflow-x-auto" data-vip-table>
        <table className="border-line w-full min-w-[640px] border-collapse border text-xs">
          <caption className="sr-only">{t('vip.tableCaption')}</caption>
          <thead>
            <tr>
              <th colSpan={2} className="border-line border-b p-2" />
              {levels.map((level) => (
                <th
                  key={level.id}
                  scope="col"
                  data-vip-col={level.id}
                  className={`border-line border-b p-2 text-center align-bottom ${
                    level.id === active.id ? 'border-t-2 border-t-accent bg-panel-soft' : ''
                  }`}
                >
                  <span
                    aria-hidden
                    className={`mx-auto grid size-6 place-items-center rounded-full text-[11px] font-semibold ${
                      level.id === active.id ? 'bg-accent text-[#1b1b1b]' : 'bg-panel text-muted'
                    }`}
                  >
                    {level.level}
                  </span>
                  <span className="text-ink mt-1 block font-semibold">{level.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.flatMap((group) =>
              group.rows.map((row, index) => (
                <tr key={row.id} className="border-line border-t">
                  {index === 0 ? (
                    <th
                      scope="rowgroup"
                      rowSpan={group.rows.length}
                      className="text-muted border-line border-r p-2 text-left align-top font-medium"
                    >
                      {group.label}
                    </th>
                  ) : null}
                  <th
                    scope="row"
                    className="text-muted border-line border-r p-2 text-left font-normal"
                  >
                    {row.label}
                  </th>
                  {levels.map((level) => {
                    const raw = row.values[level.id] ?? '—';
                    return (
                      <td
                        key={level.id}
                        data-vip-col={level.id}
                        data-active={level.id === active.id ? 'true' : undefined}
                        className={`border-line border-l p-2 text-center ${columnCell(level.id)}`}
                      >
                        {row.money ? money(Number(raw)) : raw}
                      </td>
                    );
                  })}
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>

      <section
        data-part="vip-benefits"
        data-vip-active={active.id}
        className="border-line bg-panel mt-4 rounded-[var(--radius-panel)] border p-5"
      >
        <h2 className="text-ink text-sm font-semibold">
          {t('vip.benefitsTitle', { tier: active.name })}
        </h2>
        {benefits[active.id] ?? null}
      </section>
    </div>
  );
}
