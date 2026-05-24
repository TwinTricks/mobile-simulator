import { browserAPI } from './lib/browser.js';

const SIMULATOR_URL = browserAPI.runtime.getURL('simulator.html');

async function openSimulator(initialUrl = '') {
  const url = initialUrl
    ? `${SIMULATOR_URL}?url=${encodeURIComponent(initialUrl)}`
    : SIMULATOR_URL;

  const existing = await browserAPI.tabs.query({ url: SIMULATOR_URL + '*' });
  if (existing.length > 0) {
    await browserAPI.tabs.update(existing[0].id, { active: true, url });
    await browserAPI.windows.update(existing[0].windowId, { focused: true });
    return existing[0].id;
  }
  const tab = await browserAPI.tabs.create({ url });
  return tab.id;
}

async function clearAllDynamicRules() {
  try {
    const existing = await browserAPI.declarativeNetRequest.getDynamicRules();
    const ids = existing.map((r) => r.id);
    if (ids.length) {
      await browserAPI.declarativeNetRequest.updateDynamicRules({ removeRuleIds: ids });
    }
  } catch (e) {
    // ignore
  }
}

async function applyCspMode(mode) {
  // mode: 'strip' | 'xfo-only' | 'off'
  const dnr = browserAPI.declarativeNetRequest;
  try {
    if (mode === 'off') {
      await dnr.updateEnabledRulesets({ disableRulesetIds: ['iframe_rules', 'iframe_rules_xfo_only'] });
    } else if (mode === 'xfo-only') {
      await dnr.updateEnabledRulesets({
        disableRulesetIds: ['iframe_rules'],
        enableRulesetIds: ['iframe_rules_xfo_only'],
      });
    } else {
      await dnr.updateEnabledRulesets({
        disableRulesetIds: ['iframe_rules_xfo_only'],
        enableRulesetIds: ['iframe_rules'],
      });
    }
  } catch (e) {
    // ignore — ruleset may already be in desired state
  }
}

browserAPI.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'open-simulator') {
    openSimulator(msg.url || '').then((tabId) => sendResponse({ ok: true, tabId }));
    return true;
  }
  if (msg?.type === 'get-active-url') {
    browserAPI.tabs.query({ active: true, currentWindow: true })
      .then(([tab]) => sendResponse({ ok: true, url: tab?.url || '' }));
    return true;
  }
  if (msg?.type === 'toggle-rules') {
    const action = msg.enabled
      ? browserAPI.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds: ['iframe_rules'] })
      : browserAPI.declarativeNetRequest.updateEnabledRulesets({ disableRulesetIds: ['iframe_rules'] });
    action.then(() => sendResponse({ ok: true })).catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }
  if (msg?.type === 'set-csp-mode') {
    applyCspMode(msg.mode || 'strip')
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }
  if (msg?.type === 'clear-dynamic-rules') {
    clearAllDynamicRules().then(() => sendResponse({ ok: true }));
    return true;
  }
});

// Cleanup dynamic rules when the simulator tab closes
browserAPI.tabs.onRemoved.addListener(async (tabId) => {
  try {
    const tabs = await browserAPI.tabs.query({ url: SIMULATOR_URL + '*' });
    if (tabs.length === 0) {
      await clearAllDynamicRules();
    }
  } catch {}
});

// On service worker start, clean up any leaked rules from previous sessions
clearAllDynamicRules();
