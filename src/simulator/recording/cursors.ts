/** A cursor drawn into recordings, since a tab capture never shows the real one. */
export type RecordCursor = {
  id: string;
  label: string;
  /** An SVG image, drawn at `size` pixels square. */
  svg: string;
  size: number;
  /** The point in the image that sits on the pointer. */
  hotX: number;
  hotY: number;
};

const ARROW_PATH = "M5 3l14 7.5-6.2 1.6 3.9 7.1-2.6 1.4-3.9-7.1L5 18.5z";

function arrow(fill: string, stroke: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${ARROW_PATH}" fill="${fill}" stroke="${stroke}" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
}

const HAND = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M9 11V4.5a1.5 1.5 0 0 1 3 0V10m0-1.5a1.5 1.5 0 0 1 3 0V11m0-1a1.5 1.5 0 0 1 3 0v4.5c0 3.6-2.4 6.5-6 6.5h-.6c-1.9 0-3.4-.8-4.6-2.3L4.5 15.6a1.6 1.6 0 0 1 2.4-2.1L9 15V11" fill="#fff" stroke="#18181b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const DOT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="rgba(250,204,21,.45)" stroke="rgba(234,179,8,.9)" stroke-width="1.5"/><circle cx="12" cy="12" r="2.5" fill="#18181b"/></svg>`;

const RING = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="rgba(24,24,27,.12)" stroke="#18181b" stroke-width="2"/></svg>`;

const FINGER = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="rgba(24,24,27,.28)" stroke="rgba(255,255,255,.9)" stroke-width="1.5"/></svg>`;

export const RECORD_CURSORS: readonly RecordCursor[] = [
  { id: "arrow", label: "Arrow", svg: arrow("#18181b", "#fff"), size: 26, hotX: 6, hotY: 4 },
  { id: "arrow-white", label: "White", svg: arrow("#fff", "#18181b"), size: 26, hotX: 6, hotY: 4 },
  { id: "arrow-blue", label: "Blue", svg: arrow("#38bdf8", "#fff"), size: 26, hotX: 6, hotY: 4 },
  { id: "arrow-red", label: "Red", svg: arrow("#ef4444", "#fff"), size: 26, hotX: 6, hotY: 4 },
  {
    id: "arrow-orange",
    label: "Orange",
    svg: arrow("#f97316", "#fff"),
    size: 26,
    hotX: 6,
    hotY: 4,
  },
  { id: "arrow-green", label: "Green", svg: arrow("#22c55e", "#fff"), size: 26, hotX: 6, hotY: 4 },
  {
    id: "arrow-purple",
    label: "Purple",
    svg: arrow("#8b5cf6", "#fff"),
    size: 26,
    hotX: 6,
    hotY: 4,
  },
  { id: "arrow-pink", label: "Pink", svg: arrow("#ec4899", "#fff"), size: 26, hotX: 6, hotY: 4 },
  { id: "arrow-big", label: "Big", svg: arrow("#18181b", "#fff"), size: 40, hotX: 9, hotY: 6 },
  { id: "hand", label: "Hand", svg: HAND, size: 28, hotX: 11, hotY: 3 },
  { id: "finger", label: "Finger", svg: FINGER, size: 34, hotX: 17, hotY: 17 },
  { id: "dot", label: "Spotlight", svg: DOT, size: 40, hotX: 20, hotY: 20 },
  { id: "ring", label: "Ring", svg: RING, size: 32, hotX: 16, hotY: 16 },
];

export function findCursor(id: string): RecordCursor | null {
  return RECORD_CURSORS.find((c) => c.id === id) ?? null;
}

export function cursorUrl(cursor: RecordCursor): string {
  return `data:image/svg+xml,${encodeURIComponent(cursor.svg)}`;
}
