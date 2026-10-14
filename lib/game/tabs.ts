import { titleize } from '@/lib/text';

/** Display names for the tab ids providers use, which differ between providers. */
const TAB_LABELS: Record<string, string> = {
  top: 'Top',
  all: 'All',
  new: 'New',
  slot: 'Slots',
  slots: 'Slots',
  video: 'Video slots',
  bbonus: 'Buy bonus',
  progressive: 'Progressive',
  table: 'Table',
  classic: 'Classic',
  scratchcards: 'Scratchcards',
  other: 'Other',
};

export function tabLabel(id: string): string {
  return TAB_LABELS[id] ?? titleize(id);
}
