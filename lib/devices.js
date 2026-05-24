const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const IPAD_UA = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const PIXEL_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const PIXEL_PRO_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const GALAXY_S_UA = 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const GALAXY_SU_UA = 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const GALAXY_FOLD_UA = 'Mozilla/5.0 (Linux; Android 14; SM-F946B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const GALAXY_TAB_UA = 'Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const SURFACE_DUO_UA = 'Mozilla/5.0 (Linux; Android 12; Surface Duo) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

export const PRESET_DEVICES = [
  // Phones
  { id: 'iphone-15-pro',  name: 'iPhone 15 Pro',    width: 393, height: 852, dpr: 3,     category: 'phone',   ua: IOS_UA },
  { id: 'iphone-14',      name: 'iPhone 14',        width: 390, height: 844, dpr: 3,     category: 'phone',   ua: IOS_UA },
  { id: 'iphone-se',      name: 'iPhone SE',        width: 375, height: 667, dpr: 2,     category: 'phone',   ua: IOS_UA },
  { id: 'pixel-8',        name: 'Pixel 8',          width: 412, height: 915, dpr: 2.625, category: 'phone',   ua: PIXEL_UA },
  { id: 'pixel-8-pro',    name: 'Pixel 8 Pro',      width: 448, height: 998, dpr: 3,     category: 'phone',   ua: PIXEL_PRO_UA },
  { id: 'galaxy-s24',     name: 'Galaxy S24',       width: 360, height: 780, dpr: 3,     category: 'phone',   ua: GALAXY_S_UA },
  { id: 'galaxy-s24u',    name: 'Galaxy S24 Ultra', width: 412, height: 915, dpr: 3.5,   category: 'phone',   ua: GALAXY_SU_UA },
  { id: 'galaxy-fold',    name: 'Galaxy Z Fold 5',  width: 344, height: 882, dpr: 3,     category: 'phone',   ua: GALAXY_FOLD_UA },

  // Tablets
  { id: 'ipad-mini',      name: 'iPad Mini',        width: 768, height: 1024, dpr: 2,    category: 'tablet',  ua: IPAD_UA },
  { id: 'ipad-air',       name: 'iPad Air',         width: 820, height: 1180, dpr: 2,    category: 'tablet',  ua: IPAD_UA },
  { id: 'ipad-pro-11',    name: 'iPad Pro 11"',     width: 834, height: 1194, dpr: 2,    category: 'tablet',  ua: IPAD_UA },
  { id: 'ipad-pro-13',    name: 'iPad Pro 13"',     width: 1024, height: 1366, dpr: 2,   category: 'tablet',  ua: IPAD_UA },
  { id: 'galaxy-tab-s9',  name: 'Galaxy Tab S9',    width: 753, height: 1205, dpr: 2,    category: 'tablet',  ua: GALAXY_TAB_UA },
  { id: 'surface-duo',    name: 'Surface Duo',      width: 540, height: 720, dpr: 2.5,   category: 'tablet',  ua: SURFACE_DUO_UA },

  // Desktop (no UA override — use real desktop UA)
  { id: 'laptop-13',      name: 'Laptop 13"',       width: 1280, height: 800, dpr: 2,    category: 'desktop', ua: null },
  { id: 'desktop-fhd',    name: 'Desktop 1080p',    width: 1920, height: 1080, dpr: 1,   category: 'desktop', ua: null },
];

export const DEFAULT_VISIBLE_IDS = ['iphone-15-pro', 'pixel-8', 'ipad-air'];

export function findDevice(id, customDevices = []) {
  return PRESET_DEVICES.find((d) => d.id === id)
    || customDevices.find((d) => d.id === id)
    || null;
}

export function defaultPresets() {
  const phoneIds = PRESET_DEVICES.filter((d) => d.category === 'phone').map((d) => d.id);
  const tabletIds = PRESET_DEVICES.filter((d) => d.category === 'tablet').map((d) => d.id);
  const iIds = PRESET_DEVICES
    .filter((d) => d.id.startsWith('iphone-') || d.id.startsWith('ipad-'))
    .map((d) => d.id);
  return [
    { id: 'preset-phones',   name: 'Phones only',     deviceIds: phoneIds },
    { id: 'preset-tablets',  name: 'Tablets only',    deviceIds: tabletIds },
    { id: 'preset-iphones',  name: 'iPhones & iPads', deviceIds: iIds },
  ];
}
