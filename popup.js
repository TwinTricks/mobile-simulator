import { browserAPI } from './lib/browser.js';

const urlInput = document.getElementById('url');
const openBtn = document.getElementById('open-btn');
const currentBtn = document.getElementById('current-btn');

function normalizeUrl(input) {
  let v = input.trim();
  if (!v) return '';
  if (!/^[a-z]+:\/\//i.test(v) && !v.startsWith('//')) {
    v = 'https://' + v;
  }
  try {
    return new URL(v).href;
  } catch {
    return null;
  }
}

openBtn.addEventListener('click', async () => {
  const url = normalizeUrl(urlInput.value);
  if (url === null) {
    urlInput.style.borderColor = 'crimson';
    return;
  }
  await browserAPI.runtime.sendMessage({ type: 'open-simulator', url });
  window.close();
});

currentBtn.addEventListener('click', async () => {
  const res = await browserAPI.runtime.sendMessage({ type: 'get-active-url' });
  if (res?.url && !res.url.startsWith('chrome://') && !res.url.startsWith('chrome-extension://')) {
    await browserAPI.runtime.sendMessage({ type: 'open-simulator', url: res.url });
    window.close();
  } else {
    currentBtn.textContent = 'Current tab not supported';
    setTimeout(() => (currentBtn.textContent = 'Simulate current tab'), 1500);
  }
});

urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') openBtn.click();
});

urlInput.addEventListener('input', () => {
  urlInput.style.borderColor = '';
});

urlInput.focus();
