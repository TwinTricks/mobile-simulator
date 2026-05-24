import { browserAPI } from './lib/browser.js';
import { PRESET_DEVICES, findDevice, defaultPresets } from './lib/devices.js';
import {
  getState, saveState, getSettings, saveSettings, newId,
  getDismissedWarnings, dismissWarning,
} from './lib/storage.js';
import { applyIcons } from './lib/icons.js';

const $ = (id) => document.getElementById(id);
const els = {
  grid: $('device-grid'),
  empty: $('empty-state'),
  urlInput: $('url-input'),
  goBtn: $('go-btn'),
  reloadBtn: $('reload-btn'),
  backBtn: $('back-btn'),
  forwardBtn: $('forward-btn'),
  devicesBtn: $('devices-btn'),
  devicesPanel: $('devices-panel'),
  devicesClose: $('devices-close'),
  settingsBtn: $('settings-btn'),
  settingsPanel: $('settings-panel'),
  settingsClose: $('settings-close'),
  bezelBtn: $('bezel-btn'),
  compactBtn: $('compact-btn'),
  schemeBtn: $('scheme-btn'),
  zoomBtn: $('zoom-btn'),
  zoomMenu: $('zoom-menu'),
  syncBtn: $('sync-btn'),
  themeBtn: $('theme-btn'),
  warning: $('warning'),
  warningText: $('warning-text'),
  warningClose: $('warning-close'),
  frameTpl: $('device-frame-tpl'),
  presetPhones: $('preset-phones'),
  presetTablets: $('preset-tablets'),
  presetDesktops: $('preset-desktops'),
  customList: $('custom-list'),
  cdName: $('cd-name'),
  cdWidth: $('cd-width'),
  cdHeight: $('cd-height'),
  cdDpr: $('cd-dpr'),
  cdAdd: $('cd-add'),
  presetList: $('preset-list'),
  presetSave: $('preset-save'),
  presetRestoreDefaults: $('preset-restore-defaults'),
  statusBar: $('status-bar'),
  statusCount: $('status-count'),
  statusUrl: $('status-url'),
  statusRules: $('status-rules'),
  statusClose: $('status-close'),
  settingSpoofUa: $('setting-spoof-ua'),
  settingBezel: $('setting-bezel'),
  settingCompact: $('setting-compact'),
  settingScheme: $('setting-scheme'),
  settingCsp: $('setting-csp'),
};

const SIM_PARAM = '__sim_device';
const DYNAMIC_RULE_BASE = 1000;

const state = {
  url: '',
  visibleDeviceIds: [],
  rotations: {},
  customDevices: [],
  presets: [],
  presetsInitialized: false,
  settings: null,
  syncingScroll: false,
  dismissed: new Set(),
  loadTimers: new Map(),
};

function applyTheme(theme) {
  document.body.classList.remove('theme-light', 'theme-dark', 'theme-system');
  document.body.classList.add(`theme-${theme}`);
}

function normalizeUrl(input) {
  let v = (input || '').trim();
  if (!v) return '';
  if (v.startsWith('localhost') || /^\d+\.\d+\.\d+\.\d+/.test(v)) {
    v = 'http://' + v;
  } else if (!/^[a-z]+:\/\//i.test(v) && !v.startsWith('//')) {
    v = 'https://' + v;
  }
  try {
    return new URL(v).href;
  } catch {
    return null;
  }
}

function showWarning(text, key = 'generic') {
  if (state.dismissed.has(key)) return;
  els.warningText.textContent = text;
  els.warning.dataset.key = key;
  els.warning.classList.remove('hidden');
}

function hideWarning() {
  els.warning.classList.add('hidden');
}

function getEffectiveZoom() {
  const base = state.settings?.zoom || 1;
  return state.settings?.compactView ? base * 0.6 : base;
}

function getDeviceSize(device, isRotated) {
  const w = isRotated ? device.height : device.width;
  const h = isRotated ? device.width : device.height;
  return { w, h };
}

// Build the URL each iframe loads. When spoofing UA, append a unique param
// per device so dynamic rules can target this iframe.
function iframeUrlFor(device) {
  if (!state.url) return '';
  if (!state.settings?.spoofUA || !device.ua) return state.url;
  try {
    const u = new URL(state.url);
    u.searchParams.set(SIM_PARAM, device.id);
    return u.toString();
  } catch {
    return state.url;
  }
}

function renderFrame(device, index) {
  const node = els.frameTpl.content.firstElementChild.cloneNode(true);
  node.dataset.deviceId = device.id;
  node.dataset.category = device.category || 'custom';

  const isRotated = !!state.rotations[device.id];
  if (isRotated) node.classList.add('rotated');
  if (state.settings?.bezelMode) node.classList.add('bezel-on');

  const { w, h } = getDeviceSize(device, isRotated);
  const zoom = getEffectiveZoom();

  node.querySelector('.device-name').textContent = device.name;
  node.querySelector('.device-meta').textContent = `${w}×${h} @${device.dpr}x`;

  const viewport = node.querySelector('.device-viewport');
  viewport.style.width = `${w * zoom}px`;
  viewport.style.height = `${h * zoom}px`;

  const iframe = node.querySelector('.device-iframe');
  iframe.style.width = `${w}px`;
  iframe.style.height = `${h}px`;
  iframe.style.transform = `scale(${zoom})`;

  const loading = node.querySelector('.device-loading');
  const loadingText = node.querySelector('.loading-text');
  const stopBtn = node.querySelector('.loading-stop');

  if (state.url) {
    loading.classList.remove('hidden');
    iframe.src = iframeUrlFor(device);

    // 15s timeout → show "Still loading" + Stop button
    const timer = setTimeout(() => {
      loadingText.textContent = 'Still loading…';
      stopBtn.classList.remove('hidden');
    }, 15000);
    state.loadTimers.set(device.id, timer);
  }

  iframe.addEventListener('load', () => {
    loading.classList.add('hidden');
    loadingText.textContent = 'Loading…';
    stopBtn.classList.add('hidden');
    const timer = state.loadTimers.get(device.id);
    if (timer) {
      clearTimeout(timer);
      state.loadTimers.delete(device.id);
    }
    applyColorSchemeOverride(iframe);
    detectFramebust(iframe, device);
  });
  iframe.addEventListener('error', () => {
    loading.classList.add('hidden');
    showWarning(`${device.name}: failed to load.`, 'load-error');
  });

  // Drag from header only
  const header = node.querySelector('.device-header');
  header.addEventListener('dragstart', (e) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', device.id);
    node.classList.add('dragging');
  });
  header.addEventListener('dragend', () => {
    node.classList.remove('dragging');
    document.querySelectorAll('.device-frame').forEach((f) => {
      f.classList.remove('drop-before', 'drop-after');
    });
  });

  node.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = node.getBoundingClientRect();
    const before = (e.clientX - rect.left) < rect.width / 2;
    node.classList.toggle('drop-before', before);
    node.classList.toggle('drop-after', !before);
  });
  node.addEventListener('dragleave', () => {
    node.classList.remove('drop-before', 'drop-after');
  });
  node.addEventListener('drop', (e) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId || draggedId === device.id) return;
    const rect = node.getBoundingClientRect();
    const before = (e.clientX - rect.left) < rect.width / 2;
    reorderDevices(draggedId, device.id, before);
    node.classList.remove('drop-before', 'drop-after');
  });

  return node;
}

function reorderDevices(draggedId, targetId, before) {
  const ids = state.visibleDeviceIds.filter((x) => x !== draggedId);
  const idx = ids.indexOf(targetId);
  if (idx < 0) return;
  ids.splice(before ? idx : idx + 1, 0, draggedId);
  state.visibleDeviceIds = ids;
  persistState();
  renderGrid();
}

function detectFramebust(iframe, device) {
  try {
    void iframe.contentDocument;
  } catch {
    // expected for cross-origin
  }
}

// Force prefers-color-scheme inside same-origin iframes
function applyColorSchemeOverride(iframe) {
  const scheme = state.settings?.forceColorScheme;
  if (!scheme || scheme === 'auto') return;
  try {
    const doc = iframe.contentDocument;
    if (!doc) return;
    // Style tag
    let style = doc.getElementById('__sim_color_scheme');
    if (!style) {
      style = doc.createElement('style');
      style.id = '__sim_color_scheme';
      doc.head?.appendChild(style);
    }
    style.textContent = `:root { color-scheme: ${scheme} !important; }`;
    // Meta tag
    let meta = doc.querySelector('meta[name="__sim_color_scheme"]');
    if (!meta) {
      meta = doc.createElement('meta');
      meta.setAttribute('name', '__sim_color_scheme');
      doc.head?.appendChild(meta);
    }
    meta.setAttribute('content', scheme);
  } catch {
    // cross-origin — silently fail
  }
}

function renderGrid() {
  // Clear any pending load timers
  for (const t of state.loadTimers.values()) clearTimeout(t);
  state.loadTimers.clear();

  els.grid.innerHTML = '';

  const visible = state.visibleDeviceIds
    .map((id) => findDevice(id, state.customDevices))
    .filter(Boolean);

  if (visible.length === 0) {
    els.empty.classList.remove('hidden');
  } else {
    els.empty.classList.add('hidden');
    visible.forEach((d, i) => els.grid.appendChild(renderFrame(d, i)));
  }

  applyIcons(els.grid);
  attachScrollSync();
  updateStatusBar(visible);
  // Refresh UA dynamic rules to match current visible devices
  refreshDynamicRules(visible);
}

// Cross-origin scroll sync uses chrome.scripting to inject a tiny bridge
// into each iframe. The bridge posts scroll events to the parent (this page)
// via window.postMessage, which we then broadcast to other iframes.

function scrollBridgeContentScript() {
  // Runs inside each iframe's content window.
  if (window === window.top) return;          // skip the simulator page itself
  if (window.__simScrollBridge) return;        // idempotency guard
  window.__simScrollBridge = true;

  let suppressOnce = false;
  let raf = null;

  function sendScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? window.scrollY / max : 0;
    try {
      window.parent.postMessage({ __simScroll: true, ratio }, '*');
    } catch (e) { /* silent */ }
  }

  window.addEventListener('scroll', () => {
    if (suppressOnce) { suppressOnce = false; return; }
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = null; sendScroll(); });
  }, { passive: true });

  window.addEventListener('message', (e) => {
    if (!e.data || e.data.__simScrollApply !== true) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const target = Math.max(0, e.data.ratio * max);
    suppressOnce = true;
    window.scrollTo({ top: target, behavior: 'instant' });
  });
}

async function injectScrollBridgeIntoFrames() {
  if (!state.settings?.syncScroll) return;
  try {
    const tab = await browserAPI.tabs.getCurrent();
    if (!tab?.id) return;

    // Enumerate frames and skip the top frame (frameId === 0).
    // The top frame is THIS extension page (chrome-extension://...),
    // which chrome.scripting cannot inject into. Including it via
    // allFrames:true would cause the whole call to fail.
    const frames = await browserAPI.webNavigation.getAllFrames({ tabId: tab.id });
    const targetFrameIds = (frames || [])
      .filter((f) => f.frameId !== 0)
      .map((f) => f.frameId);
    if (targetFrameIds.length === 0) return;

    await browserAPI.scripting.executeScript({
      target: { tabId: tab.id, frameIds: targetFrameIds },
      func: scrollBridgeContentScript,
    });
  } catch (e) {
    console.warn('[scroll-sync] inject failed', e?.message || e);
  }
}

function attachScrollSync() {
  // Inject bridge after each iframe finishes loading. We deliberately
  // do NOT use { once: true } so subsequent reloads (refresh action,
  // navigation, src change) trigger re-injection. The injected
  // script's own idempotency guard prevents double-binding within
  // the same window instance.
  document.querySelectorAll('.device-iframe').forEach((iframe) => {
    if (iframe.dataset.scrollBridgeBound === '1') return;
    iframe.dataset.scrollBridgeBound = '1';
    iframe.addEventListener('load', () => {
      // small delay so the iframe's document is fully parsed
      setTimeout(() => injectScrollBridgeIntoFrames(), 100);
    });
  });
}

// Parent message handler — broadcasts scroll ratio to other iframes
window.addEventListener('message', (event) => {
  if (!event.data || event.data.__simScroll !== true) return;
  if (!state.settings?.syncScroll) return;
  const sourceWindow = event.source;
  document.querySelectorAll('.device-iframe').forEach((iframe) => {
    if (iframe.contentWindow === sourceWindow) return;
    try {
      iframe.contentWindow?.postMessage(
        { __simScrollApply: true, ratio: event.data.ratio },
        '*'
      );
    } catch (e) { /* silent */ }
  });
});

// --- Dynamic rules for per-device UA spoofing ---
async function refreshDynamicRules(visibleDevices) {
  try {
    const existing = await browserAPI.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existing.map((r) => r.id);

    const addRules = [];
    if (state.settings?.spoofUA) {
      const targets = (visibleDevices || []).filter((d) => d?.ua);
      targets.forEach((d, i) => {
        addRules.push({
          id: DYNAMIC_RULE_BASE + i,
          priority: 1,
          action: {
            type: 'modifyHeaders',
            requestHeaders: [
              { header: 'user-agent', operation: 'set', value: d.ua },
            ],
          },
          condition: {
            urlFilter: `${SIM_PARAM}=${d.id}`,
            resourceTypes: [
              'main_frame', 'sub_frame', 'script', 'xmlhttprequest',
              'stylesheet', 'image', 'font', 'media', 'other',
            ],
          },
        });
      });
    }

    await browserAPI.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules,
    });
  } catch (e) {
    // Surface as a warning but don't crash the UI
    console.warn('[simulator] dynamic rules update failed', e);
  }
}

function makeDeviceRow(d, { allowRemove = false } = {}) {
  const label = document.createElement('label');
  const checked = state.visibleDeviceIds.includes(d.id);

  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.dataset.id = d.id;
  cb.checked = checked;

  const nameEl = document.createElement('span');
  nameEl.textContent = d.name;

  const metaEl = document.createElement('span');
  metaEl.className = 'meta';
  metaEl.textContent = `${d.width}×${d.height}`;

  label.appendChild(cb);
  label.appendChild(nameEl);
  label.appendChild(metaEl);

  if (allowRemove) {
    const btn = document.createElement('button');
    btn.className = 'remove-custom';
    btn.dataset.remove = d.id;
    btn.title = 'Delete custom device';
    btn.textContent = '✕';
    label.appendChild(btn);
  }
  return label;
}

function renderDevicePanel() {
  const groups = {
    phone: els.presetPhones,
    tablet: els.presetTablets,
    desktop: els.presetDesktops,
  };
  Object.values(groups).forEach((el) => (el.innerHTML = ''));

  for (const d of PRESET_DEVICES) {
    groups[d.category]?.appendChild(makeDeviceRow(d));
  }

  els.customList.innerHTML = '';
  for (const d of state.customDevices) {
    els.customList.appendChild(makeDeviceRow(d, { allowRemove: true }));
  }
}

function renderPresets() {
  els.presetList.innerHTML = '';
  if (!state.presets.length) {
    els.presetList.innerHTML = '<p class="setting-hint" style="padding:12px 16px">No presets yet. Save your current device selection to get started.</p>';
    return;
  }
  for (const p of state.presets) {
    const row = document.createElement('div');
    row.className = 'preset-row';
    row.innerHTML = `
      <span class="preset-name" data-load="${p.id}">${escapeHtml(p.name)}</span>
      <span class="preset-meta">${p.deviceIds.length} devices</span>
      <button class="preset-delete" data-del="${p.id}" title="Delete preset">✕</button>
    `;
    els.presetList.appendChild(row);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function updateStatusBar(visible) {
  const customCount = (visible || []).filter((d) => d.category === 'custom').length;
  els.statusCount.textContent = `${visible.length} device${visible.length === 1 ? '' : 's'} · ${customCount} custom`;
  els.statusUrl.textContent = state.url || '—';
  const csp = state.settings?.cspMode || 'strip';
  const label = csp === 'off' ? 'OFF' : csp === 'xfo-only' ? 'XFO only' : 'ON';
  els.statusRules.textContent = `Header rules: ${label}`;
}

async function persistState() {
  await saveState({
    url: state.url,
    visibleDeviceIds: state.visibleDeviceIds,
    rotations: state.rotations,
    customDevices: state.customDevices,
    presets: state.presets,
    presetsInitialized: state.presetsInitialized,
  });
}

async function persistSettings() {
  await saveSettings(state.settings);
}

function navigate(url) {
  const normalized = normalizeUrl(url);
  if (normalized === null) {
    showWarning('Invalid URL.', 'invalid-url');
    return;
  }
  if (!normalized) return;

  if (normalized.startsWith('http://') && location.protocol === 'https:') {
    showWarning('HTTP URL inside an HTTPS page — browser may block iframes. Try http://localhost only.', 'mixed-content');
  }

  state.url = normalized;
  els.urlInput.value = normalized;
  persistState();
  renderGrid();
}

// --- Event listeners ---
els.goBtn.addEventListener('click', () => navigate(els.urlInput.value));
els.urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') navigate(els.urlInput.value);
});

els.reloadBtn.addEventListener('click', () => {
  renderGrid(); // re-render forces fresh load + new loading state
});

els.backBtn.addEventListener('click', () => {
  document.querySelectorAll('.device-iframe').forEach((iframe) => {
    try { iframe.contentWindow.history.back(); } catch {}
  });
});

els.forwardBtn.addEventListener('click', () => {
  document.querySelectorAll('.device-iframe').forEach((iframe) => {
    try { iframe.contentWindow.history.forward(); } catch {}
  });
});

// Per-frame actions
els.grid.addEventListener('click', (e) => {
  const frame = e.target.closest('.device-frame');
  if (!frame) return;
  const id = frame.dataset.deviceId;
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (!action) return;

  if (action === 'rotate') {
    state.rotations[id] = !state.rotations[id];
    persistState();
    renderGrid();
  }
  if (action === 'refresh') {
    const iframe = frame.querySelector('.device-iframe');
    const loading = frame.querySelector('.device-loading');
    loading?.classList.remove('hidden');
    const src = iframe.src;
    iframe.src = 'about:blank';
    requestAnimationFrame(() => { iframe.src = src; });
  }
  if (action === 'open') {
    if (state.url) browserAPI.tabs.create({ url: state.url });
  }
  if (action === 'remove') {
    state.visibleDeviceIds = state.visibleDeviceIds.filter((x) => x !== id);
    persistState();
    renderGrid();
    renderDevicePanel();
  }
  if (action === 'stop-load') {
    const iframe = frame.querySelector('.device-iframe');
    iframe.src = 'about:blank';
    frame.querySelector('.device-loading')?.classList.add('hidden');
    const timer = state.loadTimers.get(id);
    if (timer) { clearTimeout(timer); state.loadTimers.delete(id); }
  }
});

// Devices panel
els.devicesBtn.addEventListener('click', () => {
  els.settingsPanel.classList.add('hidden');
  els.devicesPanel.classList.toggle('hidden');
});
els.devicesClose.addEventListener('click', () => els.devicesPanel.classList.add('hidden'));

els.devicesPanel.addEventListener('change', (e) => {
  const cb = e.target.closest('input[type="checkbox"]');
  if (!cb) return;
  const id = cb.dataset.id;
  if (cb.checked) {
    if (!state.visibleDeviceIds.includes(id)) state.visibleDeviceIds.push(id);
  } else {
    state.visibleDeviceIds = state.visibleDeviceIds.filter((x) => x !== id);
  }
  persistState();
  renderGrid();
});

els.devicesPanel.addEventListener('click', (e) => {
  const rm = e.target.closest('[data-remove]');
  if (rm) {
    const id = rm.dataset.remove;
    if (!confirm('Delete this custom device?')) return;
    state.customDevices = state.customDevices.filter((d) => d.id !== id);
    state.visibleDeviceIds = state.visibleDeviceIds.filter((x) => x !== id);
    persistState();
    renderDevicePanel();
    renderGrid();
    return;
  }
  const load = e.target.closest('[data-load]');
  if (load) {
    const p = state.presets.find((x) => x.id === load.dataset.load);
    if (!p) return;
    state.visibleDeviceIds = [...p.deviceIds];
    persistState();
    renderDevicePanel();
    renderGrid();
    return;
  }
  const del = e.target.closest('[data-del]');
  if (del) {
    if (!confirm('Delete this preset?')) return;
    state.presets = state.presets.filter((x) => x.id !== del.dataset.del);
    persistState();
    renderPresets();
    return;
  }
});

// Tabs
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.dataset.tab;
    $('tab-devices').classList.toggle('hidden', target !== 'devices');
    $('tab-custom').classList.toggle('hidden', target !== 'custom');
    $('tab-presets').classList.toggle('hidden', target !== 'presets');
  });
});

// Custom device add
els.cdAdd.addEventListener('click', () => {
  const name = els.cdName.value.trim().slice(0, 40);
  const width = Number(els.cdWidth.value);
  const height = Number(els.cdHeight.value);
  const dpr = Number(els.cdDpr.value) || 2;
  if (!name) return showWarning('Device name required.', 'cd-name');
  if (!Number.isFinite(width) || width < 100 || width > 3840) return showWarning('Width must be 100–3840.', 'cd-width');
  if (!Number.isFinite(height) || height < 100 || height > 3840) return showWarning('Height must be 100–3840.', 'cd-height');

  const device = { id: newId(), name, width, height, dpr, category: 'custom', ua: null };
  state.customDevices.push(device);
  state.visibleDeviceIds.push(device.id);
  els.cdName.value = '';
  els.cdWidth.value = '';
  els.cdHeight.value = '';
  persistState();
  renderDevicePanel();
  renderGrid();
});

// Save preset
els.presetSave.addEventListener('click', () => {
  const name = prompt('Preset name:');
  if (!name) return;
  const preset = { id: newId(), name: name.trim().slice(0, 60), deviceIds: [...state.visibleDeviceIds] };
  if (!preset.name) return;
  state.presets.push(preset);
  persistState();
  renderPresets();
});

// Restore default presets — merges any missing starters back in without
// touching the user's custom presets.
els.presetRestoreDefaults.addEventListener('click', () => {
  const defaults = defaultPresets();
  const existingIds = new Set(state.presets.map((p) => p.id));
  let added = 0;
  for (const d of defaults) {
    if (!existingIds.has(d.id)) {
      state.presets.push(d);
      added++;
    }
  }
  persistState();
  renderPresets();
  if (added === 0) {
    showWarning('All default presets are already present.', 'presets-already-present');
  }
});

// Zoom menu
els.zoomBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  els.zoomMenu.classList.toggle('hidden');
});
els.zoomMenu.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-zoom]');
  if (!btn) return;
  state.settings.zoom = Number(btn.dataset.zoom);
  document.querySelectorAll('#zoom-menu button').forEach((b) => b.classList.toggle('active', b === btn));
  await persistSettings();
  renderGrid();
  els.zoomMenu.classList.add('hidden');
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('#zoom-menu') && !e.target.closest('#zoom-btn')) {
    els.zoomMenu.classList.add('hidden');
  }
});

// Sync scroll toggle
els.syncBtn.addEventListener('click', async () => {
  state.settings.syncScroll = !state.settings.syncScroll;
  els.syncBtn.dataset.active = state.settings.syncScroll;
  await persistSettings();
  renderGrid();
});

// Bezel toggle (toolbar)
els.bezelBtn.addEventListener('click', async () => {
  state.settings.bezelMode = !state.settings.bezelMode;
  els.bezelBtn.dataset.active = state.settings.bezelMode;
  els.settingBezel.checked = state.settings.bezelMode;
  await persistSettings();
  renderGrid();
});

// Compact toggle
els.compactBtn.addEventListener('click', async () => {
  state.settings.compactView = !state.settings.compactView;
  els.compactBtn.dataset.active = state.settings.compactView;
  els.settingCompact.checked = state.settings.compactView;
  await persistSettings();
  renderGrid();
});

// Force color scheme toggle (toolbar cycles auto/light/dark)
els.schemeBtn.addEventListener('click', async () => {
  const order = ['auto', 'light', 'dark'];
  const next = order[(order.indexOf(state.settings.forceColorScheme) + 1) % order.length];
  state.settings.forceColorScheme = next;
  els.schemeBtn.dataset.active = next !== 'auto';
  els.schemeBtn.title = `Force color scheme: ${next}`;
  els.settingScheme.value = next;
  await persistSettings();
  renderGrid();
});

// Theme toggle
els.themeBtn.addEventListener('click', async () => {
  const order = ['system', 'light', 'dark'];
  const next = order[(order.indexOf(state.settings.theme) + 1) % order.length];
  state.settings.theme = next;
  applyTheme(next);
  await persistSettings();
});

// Warning close — persistent dismissal
els.warningClose.addEventListener('click', async () => {
  const key = els.warning.dataset.key || 'generic';
  state.dismissed.add(key);
  await dismissWarning(key);
  hideWarning();
});

// Settings panel
els.settingsBtn.addEventListener('click', () => {
  els.devicesPanel.classList.add('hidden');
  els.settingsPanel.classList.toggle('hidden');
});
els.settingsClose.addEventListener('click', () => els.settingsPanel.classList.add('hidden'));

els.settingSpoofUa.addEventListener('change', async () => {
  state.settings.spoofUA = els.settingSpoofUa.checked;
  await persistSettings();
  renderGrid();
});
els.settingBezel.addEventListener('change', async () => {
  state.settings.bezelMode = els.settingBezel.checked;
  els.bezelBtn.dataset.active = state.settings.bezelMode;
  await persistSettings();
  renderGrid();
});
els.settingCompact.addEventListener('change', async () => {
  state.settings.compactView = els.settingCompact.checked;
  els.compactBtn.dataset.active = state.settings.compactView;
  await persistSettings();
  renderGrid();
});
els.settingScheme.addEventListener('change', async () => {
  state.settings.forceColorScheme = els.settingScheme.value;
  els.schemeBtn.dataset.active = els.settingScheme.value !== 'auto';
  await persistSettings();
  renderGrid();
});
els.settingCsp.addEventListener('change', async () => {
  state.settings.cspMode = els.settingCsp.value;
  await persistSettings();
  try {
    await browserAPI.runtime.sendMessage({ type: 'set-csp-mode', mode: state.settings.cspMode });
  } catch {}
  updateStatusBar(state.visibleDeviceIds.map((id) => findDevice(id, state.customDevices)).filter(Boolean));
});

// Status bar
let statusUrlResetTimer = null;
els.statusUrl.addEventListener('click', async () => {
  if (!state.url) return;
  try {
    await navigator.clipboard.writeText(state.url);
    els.statusUrl.classList.add('copied');
    els.statusUrl.textContent = 'Copied!';
    clearTimeout(statusUrlResetTimer);
    statusUrlResetTimer = setTimeout(() => {
      els.statusUrl.classList.remove('copied');
      els.statusUrl.textContent = state.url || '—';
    }, 1200);
  } catch {}
});
els.statusClose.addEventListener('click', () => {
  els.statusBar.classList.add('hidden');
});

// Keyboard
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
    e.preventDefault();
    els.urlInput.focus();
    els.urlInput.select();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
    e.preventDefault();
    els.reloadBtn.click();
  }
});

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  try {
    browserAPI.runtime.sendMessage({ type: 'clear-dynamic-rules' });
  } catch {}
});

// Init
async function init() {
  applyIcons(); // hydrate static icons before first paint
  state.settings = await getSettings();
  const saved = await getState();
  state.url = saved.url || '';
  state.visibleDeviceIds = saved.visibleDeviceIds || [];
  state.rotations = saved.rotations || {};
  state.customDevices = saved.customDevices || [];
  state.presets = saved.presets || [];
  state.presetsInitialized = saved.presetsInitialized || false;
  state.dismissed = await getDismissedWarnings();

  // If init seeded default presets, persist them
  if (saved.presetsInitialized && (!Array.isArray(saved.presets) || saved.presets.length > 0)) {
    persistState();
  }

  applyTheme(state.settings.theme);
  els.syncBtn.dataset.active = state.settings.syncScroll;
  els.bezelBtn.dataset.active = state.settings.bezelMode;
  els.compactBtn.dataset.active = state.settings.compactView;
  els.schemeBtn.dataset.active = state.settings.forceColorScheme !== 'auto';
  els.schemeBtn.title = `Force color scheme: ${state.settings.forceColorScheme}`;

  els.settingSpoofUa.checked = state.settings.spoofUA;
  els.settingBezel.checked = state.settings.bezelMode;
  els.settingCompact.checked = state.settings.compactView;
  els.settingScheme.value = state.settings.forceColorScheme;
  els.settingCsp.value = state.settings.cspMode;

  document.querySelectorAll('#zoom-menu button').forEach((b) => {
    b.classList.toggle('active', Number(b.dataset.zoom) === state.settings.zoom);
  });

  // Apply CSP mode via background (in case it changed in another session)
  try {
    await browserAPI.runtime.sendMessage({ type: 'set-csp-mode', mode: state.settings.cspMode });
  } catch {}

  // Read URL from query string (set by background openSimulator)
  const params = new URLSearchParams(location.search);
  const initialUrl = params.get('url');
  if (initialUrl) {
    state.url = initialUrl;
  }
  els.urlInput.value = state.url;

  renderDevicePanel();
  renderPresets();
  renderGrid();
}

init();
