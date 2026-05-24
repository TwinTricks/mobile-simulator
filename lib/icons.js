// Iconsax Linear-style SVG icons for Mobile Simulator.
// 24x24 viewBox, stroke=currentColor, stroke-width=1.5, fill=none,
// rounded line caps and joins.
//
// Paths are based on Lucide (MIT-licensed, ISC-compatible), which is
// visually near-identical to Iconsax Linear. Users can override any
// icon by dropping a 24x24 SVG into `icons/ui/<name>.svg`.

const PATHS = {
  // Brand: monitor with stand
  logo: `
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <path d="M8 21h8"/>
    <path d="M12 17v4"/>
  `,
  // Navigation chevrons
  back: `<path d="m15 18-6-6 6-6"/>`,
  forward: `<path d="m9 18 6-6-6-6"/>`,
  // Refresh — circular arrow
  refresh: `
    <path d="M21 12a9 9 0 1 1-3-6.7"/>
    <path d="M21 3v6h-6"/>
  `,
  // Devices panel — smartphone (Lucide-style)
  devices: `
    <rect x="7" y="2" width="10" height="20" rx="2"/>
    <path d="M11 18h2"/>
  `,
  // Phone — alias of smartphone for clarity in category groups
  phone: `
    <rect x="7" y="2" width="10" height="20" rx="2"/>
    <path d="M11 18h2"/>
  `,
  // Tablet (Lucide tablet)
  tablet: `
    <rect x="4" y="2" width="16" height="20" rx="2"/>
    <path d="M10 18h4"/>
  `,
  // Monitor / Desktop (Lucide monitor)
  monitor: `
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <path d="M8 21h8"/>
    <path d="M12 17v4"/>
  `,
  // Bezel — square outline with title bar (frame)
  bezel: `
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M3 9h18"/>
  `,
  // Compact — 4-square grid (Lucide layout-grid)
  compact: `
    <rect x="3" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/>
  `,
  // Zoom in (Lucide search + plus)
  zoom: `
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.3-4.3"/>
    <path d="M11 8v6"/>
    <path d="M8 11h6"/>
  `,
  // Sync scroll — vertical arrows up/down (Lucide arrow-down-up)
  sync: `
    <path d="m3 16 4 4 4-4"/>
    <path d="M7 20V4"/>
    <path d="m21 8-4-4-4 4"/>
    <path d="M17 4v16"/>
  `,
  // Sun — symmetric 8 spokes (Lucide sun)
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
  // Moon (Lucide moon)
  moon: `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`,
  // Settings / gear (Lucide settings, simplified single-path)
  settings: `
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    <circle cx="12" cy="12" r="3"/>
  `,
  // Rotate — clockwise rotation arrow (Lucide rotate-cw)
  rotate: `
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
    <path d="M21 3v5h-5"/>
  `,
  // External link / open in tab (Lucide external-link)
  external: `
    <path d="M15 3h6v6"/>
    <path d="M10 14 21 3"/>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
  `,
  // Close / X (Lucide x)
  close: `
    <path d="M18 6 6 18"/>
    <path d="m6 6 12 12"/>
  `,
  // Drag handle / 6 dots (Lucide grip-vertical)
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
  // Plus (Lucide plus)
  plus: `
    <path d="M12 5v14"/>
    <path d="M5 12h14"/>
  `,
  // Save (Lucide save / floppy disk)
  save: `
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <path d="M17 21v-8H7v8"/>
    <path d="M7 3v5h8"/>
  `,
  // Bookmark (alt for save preset)
  bookmark: `<path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>`,
  // Eye (Lucide eye)
  eye: `
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
    <circle cx="12" cy="12" r="3"/>
  `,
  // Globe (Lucide globe)
  globe: `
    <circle cx="12" cy="12" r="10"/>
    <path d="M2 12h20"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  `,
  // Arrow right (Lucide arrow-right)
  'arrow-right': `
    <path d="M5 12h14"/>
    <path d="m12 5 7 7-7 7"/>
  `,
  // Restart / rotate-ccw (Lucide rotate-ccw — for "restore defaults")
  restart: `
    <path d="M3 12a9 9 0 1 0 9-9c-2.52 0-4.93 1-6.74 2.74L3 8"/>
    <path d="M3 3v5h5"/>
  `,
  // Trash / delete (alt for close in destructive contexts)
  trash: `
    <path d="M3 6h18"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  `,
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

// Returns the list of supported built-in icon names.
export function listIcons() {
  return Object.keys(PATHS);
}

// Synchronous hydration of built-in icons. Fast — runs before first paint.
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

// User overrides removed — was generating 404 spam on every render and
// adding no value without override files in place. Edit the PATHS object
// directly above to customize an icon. (Kept this no-op export so any
// call site that imports applyIconOverrides doesn't break.)
export async function applyIconOverrides() {
  /* no-op */
}
