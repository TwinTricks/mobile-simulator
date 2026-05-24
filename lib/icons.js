// Iconsax Linear-style SVG icons for Mobile Simulator.
// 24x24 viewBox, stroke=currentColor, stroke-width=1.5, fill=none,
// rounded line caps and joins.

const PATHS = {
  // Brand: stacked monitor/window
  logo: `
    <rect x="3" y="4" width="18" height="14" rx="2.5"/>
    <path d="M3 8h18"/>
    <circle cx="6" cy="6" r="0.5" fill="currentColor"/>
    <circle cx="8" cy="6" r="0.5" fill="currentColor"/>
    <path d="M9 21h6"/>
    <path d="M12 18v3"/>
  `,
  // Navigation
  back: `<path d="m15 6-6 6 6 6"/>`,
  forward: `<path d="m9 6 6 6-6 6"/>`,
  refresh: `
    <path d="M19.93 7.5a8 8 0 1 0 1.07 6.5"/>
    <path d="M20 4v4h-4"/>
  `,
  // Devices panel — mobile/smartphone
  devices: `
    <rect x="7" y="3" width="10" height="18" rx="2"/>
    <path d="M11 18h2"/>
  `,
  // Bezel — square outline
  bezel: `
    <rect x="4" y="3" width="16" height="18" rx="2.5"/>
    <path d="M9 6h6"/>
  `,
  // Compact — minimize / grid-2
  compact: `
    <rect x="3" y="3" width="7" height="7" rx="1.5"/>
    <rect x="14" y="3" width="7" height="7" rx="1.5"/>
    <rect x="3" y="14" width="7" height="7" rx="1.5"/>
    <rect x="14" y="14" width="7" height="7" rx="1.5"/>
  `,
  // Zoom in / search-zoom-in
  zoom: `
    <circle cx="11" cy="11" r="7"/>
    <path d="m20 20-3.5-3.5"/>
    <path d="M11 8v6"/>
    <path d="M8 11h6"/>
  `,
  // Sync scroll — arrow up-down
  sync: `
    <path d="M7 3v18"/>
    <path d="m4 6 3-3 3 3"/>
    <path d="M17 21V3"/>
    <path d="m14 18 3 3 3-3"/>
  `,
  // Sun / theme
  sun: `
    <circle cx="12" cy="12" r="4"/>
    <path d="M12 2v2"/>
    <path d="M12 20v2"/>
    <path d="m4.93 4.93 1.41 1.41"/>
    <path d="m17.66 17.66 1.41 1.41"/>
    <path d="M2 12h2"/>
    <path d="M20 12h2"/>
    <path d="m6.34 17.66-1.41 1.41"/>
    <path d="m19.07 4.93-1.41 1.41"/>
  `,
  // Moon / theme
  moon: `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`,
  // Settings / gear
  settings: `
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
    <path d="M19.622 10.395l-1.097-2.65L20 6l-2-2-1.735 1.483-2.707-1.113L12.935 2h-1.954l-.632 2.401-2.645 1.115L6 4 4 6l1.453 1.789-1.08 2.657L2 11v2l2.401.655L5.516 16.3 4 18l2 2 1.791-1.46 2.606 1.072L11 22h2l.604-2.387 2.651-1.098C16.697 18.831 18 20 18 20l2-2-1.484-1.75 1.098-2.652 2.386-.62V11l-2.378-.605Z"/>
  `,
  // Rotate — circular arrow
  rotate: `
    <path d="M21 12a9 9 0 1 1-3-6.7"/>
    <path d="M21 4v5h-5"/>
  `,
  // External link / open in tab
  external: `
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <path d="M15 3h6v6"/>
    <path d="M10 14 21 3"/>
  `,
  // Close / X
  close: `
    <path d="M18 6 6 18"/>
    <path d="m6 6 12 12"/>
  `,
  // Drag handle / 6 dots
  drag: `
    <circle cx="9" cy="5" r="1" fill="currentColor"/>
    <circle cx="9" cy="12" r="1" fill="currentColor"/>
    <circle cx="9" cy="19" r="1" fill="currentColor"/>
    <circle cx="15" cy="5" r="1" fill="currentColor"/>
    <circle cx="15" cy="12" r="1" fill="currentColor"/>
    <circle cx="15" cy="19" r="1" fill="currentColor"/>
  `,
  // Stop — square
  stop: `<rect x="6" y="6" width="12" height="12" rx="1"/>`,
};

const SVG_OPEN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon-svg" aria-hidden="true">`;
const SVG_CLOSE = `</svg>`;

export function getIcon(name) {
  const inner = PATHS[name];
  if (!inner) {
    console.warn('[icons] unknown icon:', name);
    return '';
  }
  return SVG_OPEN + inner + SVG_CLOSE;
}

export function applyIcons(root = document) {
  const nodes = root.querySelectorAll('[data-icon]');
  nodes.forEach((el) => {
    const name = el.getAttribute('data-icon');
    if (!name) return;
    if (el.dataset.iconLoaded === '1') return;
    el.innerHTML = getIcon(name);
    el.dataset.iconLoaded = '1';
  });
}
