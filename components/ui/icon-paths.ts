/** Circle as two arcs, so every icon can be described with path data alone. */
const c = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;

/**
 * Inline stroke icons. Hand-drawn placeholders: no icon dependency, no external
 * sprite, and the set only covers what the shell needs.
 */
export const ICON_PATHS = {
  home: ['M3 10.5 12 3l9 7.5', 'M5.5 9.2V20h13V9.2'],
  slots: ['M4 4h6.5v6.5H4z', 'M13.5 4H20v6.5h-6.5z', 'M4 13.5h6.5V20H4z', 'M13.5 13.5H20V20h-6.5z'],
  livecasino: ['M4 5h16v14H4z', 'M8 12h8', 'M8 15h5', c(17.5, 8, 1.6)],
  sports: [c(12, 12, 8), 'M12 4v16', 'M4 12h16'],
  esports: ['M6 9h12a4 4 0 0 1 4 4v3h-5l-1-2H8l-1 2H2v-3a4 4 0 0 1 4-4Z', 'M8 11.5v3', 'M6.5 13h3', c(16.5, 12.5, 1)],
  fast: ['M13 2 5 13h5l-1 9 8-11h-5l1-9z'],
  dice4d: ['M4 4h16v16H4z', c(9, 9, 1), c(15, 9, 1), c(9, 15, 1), c(15, 15, 1)],
  numbers: ['M7 3v18', 'M17 3v18', 'M3 8h18', 'M3 16h18'],
  prediction: ['M4 19V5', 'M4 19h16', 'M7 15l4-5 3 3 5-7', 'M16 6h3v3'],
  gift: ['M3 9h18v4H3z', 'M5 13h14v8H5z', 'M12 9v12', 'M12 9C10 9 7 7.5 7 5.5A2.5 2.5 0 0 1 12 5a2.5 2.5 0 0 1 5 .5C17 7.5 14 9 12 9z'],
  news: ['M4 5h12v14H4z', 'M16 9h4v8a2 2 0 0 1-2 2h-2', 'M7 9h6', 'M7 12h6', 'M7 15h4'],
  trophy: ['M8 4h8v4a4 4 0 0 1-8 0z', 'M8 5H5v2a3 3 0 0 0 3 3', 'M16 5h3v2a3 3 0 0 1-3 3', 'M12 12v5', 'M9 20h6', 'M10.5 17h3'],
  crown: ['M3 8l3 10h12l3-10-5 4-4-7-4 7-5-4z'],
  sponsor: ['M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 15.6 7.1 18.2 8 12.7 4 8.8 9.5 8z'],
  wallet: ['M3 8h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M3 8V6a2 2 0 0 1 2-2h11', c(16.5, 13, 1.4)],
  withdraw: ['M4 6h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z', 'M12 10v5', 'M9.5 12.5 12 10l2.5 2.5'],
  transfer: ['M4 8h13', 'M14 5l3 3-3 3', 'M20 16H7', 'M10 13l-3 3 3 3'],
  history: [c(12, 12, 8), 'M12 8v4l3 2'],
  pending: [c(12, 12, 8), 'M12 8v4', 'M12 16h.01'],
  mail: ['M3 6h18v12H3z', 'M3 7l9 6 9-6'],
  rebate: ['M6 18 18 6', c(9, 9, 2), c(15, 15, 2)],
  achievement: [c(12, 10, 5), 'M9 15l-1 6 4-2 4 2-1-6'],
  ticket: ['M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z', 'M10 7v10'],
  user: [c(12, 9, 3.5), 'M5 20a7 7 0 0 1 14 0'],
  chat: ['M4 5h16v10H9l-5 4z'],
  phone: ['M6 3h3l2 5-2 1a10 10 0 0 0 5 5l1-2 5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2z'],
  whatsapp: ['M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3z', 'M9 9.5c0 3 2.5 5.5 5.5 5.5'],
  telegram: ['M21 4 3 11l5 2 2 6 3-4 5 3z'],
  facebook: ['M14 8h2V5h-2a4 4 0 0 0-4 4v2H8v3h2v7h3v-7h2.5l.5-3H13V9a1 1 0 0 1 1-1z'],
  instagram: ['M4 4h16v16H4z', c(12, 12, 4), c(17, 7, 0.8)],
  x: ['M5 4l14 16', 'M19 4 5 20'],
  youtube: ['M3 8a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z', 'M11 9.5l5 2.5-5 2.5z'],
  menu: ['M4 7h16', 'M4 12h16', 'M4 17h16'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  search: [c(11, 11, 6), 'M15.5 15.5 21 21'],
  chevronDown: ['M6 9l6 6 6-6'],
  chevronRight: ['M9 6l6 6-6 6'],
  chevronLeft: ['M15 6l-6 6 6 6'],
  play: ['M8 5l12 7-12 7z'],
  download: ['M12 4v12', 'M7 12l5 5 5-5', 'M5 20h14'],
  external: ['M14 4h6v6', 'M20 4 10 14', 'M18 14v6H4V6h6'],
  shield: ['M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z'],
  check: ['M5 13l4 4L19 7'],
  alert: [c(12, 12, 8), 'M12 8v4', 'M12 16h.01'],
  info: [c(12, 12, 8), 'M12 11v5', 'M12 8h.01'],
  success: [c(12, 12, 8), 'M8.5 12.5l2.5 2.5 4.5-5'],
  spinner: [c(12, 12, 8), 'M12 4v5'],
  lock: ['M6 11h12v9H6z', 'M9 11V8a3 3 0 0 1 6 0v3'],
  eye: ['M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z', c(12, 12, 2.5)],
} satisfies Record<string, string[]>;

export type IconName = keyof typeof ICON_PATHS;
