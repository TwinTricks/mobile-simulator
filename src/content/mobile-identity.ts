/**
 * Runs in the page's own world at document_start in every frame, registered by the service
 * worker. It only wakes up in a simulator device frame, which the simulator marks through the
 * iframe's `name`, and there:
 *
 * - gives the page's scripts the device's identity: user agent, platform, touch points, screen
 *   size, pixel ratio and touch pointer media queries. The request header is set separately by
 *   the dynamic rules, and CSS media queries keep the real pointer.
 * - in touch mode, draws a fingertip cursor and scrolls by dragging, with momentum on release.
 * - passes the simulator's shortcut keys up while the page has focus.
 * - reports text fields taking focus for the on-screen keyboard, and types its keys.
 * - hides scrollbars, reports scroll position for sync, and the page's top colour for the
 *   status bar.
 *
 * It is built on its own, so it must not import anything.
 */

type Platform = "ios" | "ipad" | "android" | "android-tablet";

// Mirrors FrameIdentity in src/shared/identity.ts.
type Identity = {
  ua: string | null;
  platform: Platform | null;
  width: number;
  height: number;
  dpr: number;
  touch: boolean;
  scrollbars: boolean;
};

const PREFIX = "__msim:";

function readIdentity(): Identity | null {
  if (window === window.top || !window.name.startsWith(PREFIX)) return null;
  try {
    return JSON.parse(window.name.slice(PREFIX.length)) as Identity;
  } catch {
    return null;
  }
}

function getter(target: object, key: string, get: () => unknown) {
  try {
    Object.defineProperty(target, key, { get, configurable: true, enumerable: true });
  } catch {
    // A page that froze the property first keeps it.
  }
}

function spoofIdentity({ ua, platform, width, height, dpr }: Identity & { ua: string }) {
  const apple = platform === "ios" || platform === "ipad";
  const nav = Navigator.prototype;
  getter(nav, "userAgent", () => ua);
  getter(nav, "appVersion", () => ua.replace(/^Mozilla\//, ""));
  getter(nav, "platform", () =>
    platform === "ios" ? "iPhone" : platform === "ipad" ? "iPad" : "Linux armv81",
  );
  getter(nav, "vendor", () => (apple ? "Apple Computer, Inc." : "Google Inc."));
  getter(nav, "maxTouchPoints", () => 5);

  // Safari has no client hints at all.
  const chrome = /Chrome\/([\d.]+)/.exec(ua)?.[1] ?? "130.0.0.0";
  const major = chrome.split(".")[0];
  const brands = [
    { brand: "Chromium", version: major },
    { brand: "Google Chrome", version: major },
    { brand: "Not?A_Brand", version: "99" },
  ];
  const mobile = platform === "android";
  const uaData = {
    brands,
    mobile,
    platform: "Android",
    getHighEntropyValues: () =>
      Promise.resolve({
        brands,
        mobile,
        platform: "Android",
        architecture: "",
        bitness: "",
        model: /Android [\d.]+; ([^)]+)\)/.exec(ua)?.[1] ?? "",
        platformVersion: /Android ([\d.]+)/.exec(ua)?.[1] ?? "",
        uaFullVersion: chrome,
        fullVersionList: brands.map((b) => ({
          ...b,
          version: b.brand === "Not?A_Brand" ? "99.0.0.0" : chrome,
        })),
        wow64: false,
      }),
    toJSON: () => ({ brands, mobile, platform: "Android" }),
  };
  getter(nav, "userAgentData", () => (apple || !platform ? undefined : uaData));

  // The frame's own size says which way the device is turned.
  const portrait = () => window.innerWidth <= window.innerHeight;
  const screenWidth = () => (portrait() ? width : height);
  const screenHeight = () => (portrait() ? height : width);
  const screen = Screen.prototype;
  getter(screen, "width", screenWidth);
  getter(screen, "height", screenHeight);
  getter(screen, "availWidth", screenWidth);
  getter(screen, "availHeight", screenHeight);
  getter(window, "devicePixelRatio", () => dpr);
  getter(window, "orientation", () => (portrait() ? 0 : 90));

  if (!("ontouchstart" in window)) {
    Object.defineProperty(window, "ontouchstart", { value: null, writable: true });
  }

  // `(grid: 0)` always matches a screen and `(grid: 1)` never does.
  const yes = "(grid: 0)";
  const no = "(grid: 1)";
  const rewrites: [RegExp, string][] = [
    [/\(\s*(any-)?pointer\s*:\s*coarse\s*\)/gi, yes],
    [/\(\s*(any-)?pointer\s*:\s*(fine|none)\s*\)/gi, no],
    [/\(\s*(any-)?hover\s*:\s*none\s*\)/gi, yes],
    [/\(\s*(any-)?hover\s*:\s*hover\s*\)/gi, no],
    [/\(\s*(any-)?pointer\s*\)/gi, yes],
    [/\(\s*(any-)?hover\s*\)/gi, no],
  ];
  const matchMedia = window.matchMedia.bind(window);
  window.matchMedia = (query: string) =>
    matchMedia(rewrites.reduce((q, [pattern, value]) => q.replace(pattern, value), String(query)));
}

const FINGER = (fill: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><circle cx='16' cy='16' r='12' fill='${fill}' stroke='white' stroke-opacity='.9' stroke-width='2'/></svg>`,
  )}") 16 16, pointer`;

const TOUCH_CSS = `
html.__msim-touch, html.__msim-touch * { cursor: ${FINGER("rgba(24,24,27,.28)")} !important; }
html.__msim-touch.__msim-pressed, html.__msim-touch.__msim-pressed * { cursor: ${FINGER("rgba(24,24,27,.5)")} !important; }
html.__msim-touch img, html.__msim-touch a { -webkit-user-drag: none; }
html.__msim-dragging, html.__msim-dragging * { user-select: none !important; }
`;

/** Moving this far before letting go turns a press into a drag rather than a tap. */
const DRAG_START = 6;
/** Velocity is measured over this last stretch of the drag, in milliseconds. */
const SAMPLE_MS = 100;
/** A pause this long before letting go means no glide. */
const PAUSE_MS = 150;
/** Fraction of the glide speed kept per millisecond. */
const FRICTION = 0.997;
const MAX_SPEED = 6;
const STOP_SPEED = 0.02;

const EDITABLE =
  'input, textarea, select, [contenteditable=""], [contenteditable="true"], [draggable="true"]';

type Press = {
  id: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  target: Element;
  scroller: Element | null;
  dragging: boolean;
  samples: { t: number; x: number; y: number }[];
};

function root(): Element {
  return document.scrollingElement ?? document.documentElement;
}

function canScroll(element: Element, vertical: boolean): boolean {
  if (element === root()) {
    return vertical
      ? element.scrollHeight > window.innerHeight + 1
      : element.scrollWidth > window.innerWidth + 1;
  }
  const style = getComputedStyle(element);
  const overflow = vertical ? style.overflowY : style.overflowX;
  if (!/auto|scroll|overlay/.test(overflow)) return false;
  return vertical
    ? element.scrollHeight > element.clientHeight + 1
    : element.scrollWidth > element.clientWidth + 1;
}

/** Where a drag that started on `target` goes: null when the page handles that gesture itself. */
function scrollerFor(target: Element, vertical: boolean): Element | null {
  const pan = vertical ? "pan-y" : "pan-x";
  for (let node: Element | null = target; node; node = node.parentElement) {
    const action = getComputedStyle(node).touchAction;
    if (action !== "auto" && action !== "manipulation" && !action.includes(pan)) return null;
    if (node !== document.documentElement && node !== document.body && canScroll(node, vertical)) {
      return node;
    }
  }
  return canScroll(root(), vertical) ? root() : null;
}

/** When touch mode last swallowed the click that ends a drag, so sync can skip it too. */
let swallowedAt = -Infinity;

function touchMode(initial: boolean) {
  const html = document.documentElement;
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(TOUCH_CSS);
  let on = false;
  let press: Press | null = null;
  let glide = 0;

  const setOn = (value: boolean) => {
    on = value;
    if (on && !document.adoptedStyleSheets.includes(sheet)) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    }
    html.classList.toggle("__msim-touch", on);
  };

  const stopGlide = () => {
    cancelAnimationFrame(glide);
    glide = 0;
  };

  const startGlide = (element: Element, vx: number, vy: number) => {
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(now - last, 50);
      last = now;
      const { scrollLeft, scrollTop } = element;
      element.scrollBy({ left: -vx * dt, top: -vy * dt, behavior: "instant" });
      const decay = FRICTION ** dt;
      vx *= decay;
      vy *= decay;
      const moved = element.scrollLeft !== scrollLeft || element.scrollTop !== scrollTop;
      glide = moved && Math.hypot(vx, vy) > STOP_SPEED ? requestAnimationFrame(step) : 0;
    };
    glide = requestAnimationFrame(step);
  };

  const release = (glideOn: boolean) => {
    const done = press;
    press = null;
    html.classList.remove("__msim-pressed", "__msim-dragging");
    if (!done?.dragging || !done.scroller) return;

    // The click that follows a drag would otherwise follow whatever link the finger left on.
    const swallow = (event: Event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    swallowedAt = performance.now();
    window.addEventListener("click", swallow, { capture: true, once: true });
    setTimeout(() => window.removeEventListener("click", swallow, true), 0);

    const last = done.samples[done.samples.length - 1];
    // Holding still before letting go stops the page where it is, as on a phone.
    if (!glideOn || performance.now() - last.t > PAUSE_MS) return;
    const recent = done.samples.filter((s) => last.t - s.t <= SAMPLE_MS);
    if (recent.length < 2) return;
    const first = recent[0];
    const dt = last.t - first.t;
    if (dt <= 0) return;
    const clamp = (v: number) => Math.max(-MAX_SPEED, Math.min(MAX_SPEED, v));
    startGlide(done.scroller, clamp((last.x - first.x) / dt), clamp((last.y - first.y) / dt));
  };

  window.addEventListener("pointerdown", (event) => {
    stopGlide();
    if (!on || event.defaultPrevented || event.button !== 0 || event.pointerType !== "mouse") {
      return;
    }
    const target = event.target instanceof Element ? event.target : null;
    if (!target || target.closest(EDITABLE)) return;
    html.classList.add("__msim-pressed");
    press = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      target,
      scroller: null,
      dragging: false,
      samples: [{ t: performance.now(), x: event.clientX, y: event.clientY }],
    };
  });

  window.addEventListener(
    "pointermove",
    (event) => {
      if (!press || event.pointerId !== press.id) return;
      if (event.buttons === 0) {
        release(false);
        return;
      }
      if (!press.dragging) {
        const dx = event.clientX - press.startX;
        const dy = event.clientY - press.startY;
        if (Math.hypot(dx, dy) < DRAG_START) return;
        press.scroller = scrollerFor(press.target, Math.abs(dy) >= Math.abs(dx));
        if (!press.scroller) {
          press = null;
          html.classList.remove("__msim-pressed");
          return;
        }
        press.dragging = true;
        html.classList.add("__msim-dragging");
        window.getSelection()?.removeAllRanges();
      }
      press.scroller?.scrollBy({
        left: press.lastX - event.clientX,
        top: press.lastY - event.clientY,
        behavior: "instant",
      });
      press.lastX = event.clientX;
      press.lastY = event.clientY;
      const now = performance.now();
      press.samples.push({ t: now, x: event.clientX, y: event.clientY });
      while (press.samples.length > 2 && now - press.samples[0].t > SAMPLE_MS) {
        press.samples.shift();
      }
    },
    true,
  );

  window.addEventListener("pointerup", () => release(true), true);
  window.addEventListener("pointercancel", () => release(false), true);
  window.addEventListener("wheel", stopGlide, { capture: true, passive: true });
  window.addEventListener(
    "dragstart",
    (event) => {
      if (on && press) event.preventDefault();
    },
    true,
  );

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) return;
    const data = event.data as { __msimTouch?: unknown } | null;
    if (typeof data?.__msimTouch === "boolean") setOn(data.__msimTouch);
  });

  setOn(initial);
}

// Must match the keys in src/simulator/shortcuts.ts.
const SHORTCUT_KEYS = new Set(["r", "c", "d", "s", "v", "f", "+", "=", "-", "_", "0", "escape"]);

/**
 * Hands the simulator's shortcut keys up while the page has focus. Only presses the page left
 * alone go up, so a site's own shortcut on the same key wins.
 */
function forwardShortcuts() {
  window.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if (!SHORTCUT_KEYS.has(event.key.toLowerCase())) return;
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable || target.closest("input, textarea, select"))
    ) {
      return;
    }
    window.parent.postMessage({ __msimKey: event.key }, "*");
  });
}

// Phones draw no scrollbar beside the page, only a brief overlay while it moves, so a page laid
// out here gets its full width as it would on the device.
const NO_SCROLLBARS_CSS = `
*, *::before, *::after { scrollbar-width: none !important; }
::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
`;

// For !important rules the first cascade layer wins over every later layer and over unlayered
// rules, so a site's own `scrollbar-width: thin !important` (a Tailwind utility, say, which
// sits in a layer) can't bring the scrollbar back. The style has to come first in <head> for
// its layer to be the first.
const LAYERED_CSS = `@layer __msim-scrollbars {${NO_SCROLLBARS_CSS}}`;
const STYLE_ID = "__msim-no-scrollbars";

/** Hides the scrollbars while `hidden`, and follows the simulator's messages after that. */
function hideScrollbars(initiallyHidden: boolean) {
  let hidden = initiallyHidden;
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(NO_SCROLLBARS_CSS);
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = LAYERED_CSS;

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) return;
    const value = (event.data as { __msimScrollbars?: unknown } | null)?.__msimScrollbars;
    if (typeof value !== "boolean") return;
    hidden = !value;
    if (hidden) {
      ensure();
    } else {
      style.remove();
      document.adoptedStyleSheets = document.adoptedStyleSheets.filter((s) => s !== sheet);
    }
  });

  // Sites that render the whole document, or set `adoptedStyleSheets` outright, can drop
  // either one.
  const ensure = () => {
    if (!hidden) return;
    const head = document.head;
    if (head && head.firstElementChild !== style) head.prepend(style);
    if (!document.adoptedStyleSheets.includes(sheet)) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    }
  };
  ensure();

  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      ensure();
    });
  });
  observer.observe(document, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", ensure, { once: true });
  window.addEventListener("load", ensure, { once: true });
}

/**
 * While the simulator records, tells it that someone is using the page (at most every second),
 * so a recording left running with nothing happening can stop.
 */
function activityReporter() {
  const EVENTS = ["pointermove", "pointerdown", "keydown", "wheel", "scroll", "input"] as const;
  let last = 0;
  const report = () => {
    const now = Date.now();
    if (now - last < 1000) return;
    last = now;
    window.parent.postMessage({ __msimActive: true }, "*");
  };
  let watching = false;
  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) return;
    const on = (event.data as { __msimWatch?: unknown } | null)?.__msimWatch;
    if (typeof on !== "boolean" || on === watching) return;
    watching = on;
    for (const type of EVENTS) {
      if (on) window.addEventListener(type, report, { capture: true, passive: true });
      else window.removeEventListener(type, report, { capture: true });
    }
  });
}

/**
 * While the simulator records with a drawn cursor: hides the real one, which a tab capture
 * leaves out anyway, and tells the simulator where the pointer is so it can draw it.
 */
function recordingCursor() {
  const CLASS = "__msim-rec";
  const style = document.createElement("style");
  // Stronger than the touch mode's fingertip, which also sets the cursor with !important.
  style.textContent = `:root.${CLASS}.${CLASS}, :root.${CLASS}.${CLASS} * { cursor: none !important; }`;
  let at: { x: number; y: number } | null = null;
  let frame = 0;

  const post = (down: boolean) => {
    if (at) window.parent.postMessage({ __msimPointer: { ...at, down } }, "*");
  };
  const onMove = (event: PointerEvent) => {
    at = { x: event.clientX, y: event.clientY };
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      post(false);
    });
  };
  const onDown = (event: PointerEvent) => {
    at = { x: event.clientX, y: event.clientY };
    post(true);
  };

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) return;
    const on = (event.data as { __msimCursor?: unknown } | null)?.__msimCursor;
    if (typeof on !== "boolean") return;
    document.documentElement.classList.toggle(CLASS, on);
    if (on) {
      (document.head ?? document.documentElement).append(style);
      window.addEventListener("pointermove", onMove, true);
      window.addEventListener("pointerdown", onDown, true);
    } else {
      style.remove();
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("pointerdown", onDown, true);
    }
  });
}

/**
 * Tells the simulator whether the page is a web app that opens like an installed one: a
 * manifest whose `display` (or first `display_override`) is standalone or fullscreen.
 */
function pwaReporter() {
  const report = (pwa: boolean) => window.parent.postMessage({ __msimPwa: pwa }, "*");
  const check = async () => {
    const link = document.querySelector<HTMLLinkElement>('link[rel~="manifest"]');
    if (!link?.href) return report(false);
    try {
      const response = await fetch(link.href, {
        credentials: link.crossOrigin === "use-credentials" ? "include" : "same-origin",
      });
      const manifest = (await response.json()) as {
        display?: unknown;
        display_override?: unknown;
      };
      const override = Array.isArray(manifest.display_override)
        ? manifest.display_override[0]
        : undefined;
      const display = typeof override === "string" ? override : manifest.display;
      report(display === "standalone" || display === "fullscreen");
    } catch {
      report(false);
    }
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => void check(), { once: true });
  } else {
    void check();
  }
}

/**
 * Reports the page's scroll position to the simulator as a ratio, and applies the ratio it is
 * sent back, which keeps several devices on the same spot. The simulator ignores the reports
 * while sync is off.
 */
function scrollBridge() {
  let suppressOnce = false;
  let frame: number | null = null;
  const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;

  window.addEventListener(
    "scroll",
    () => {
      if (suppressOnce) {
        suppressOnce = false;
        return;
      }
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        const max = maxScroll();
        window.parent.postMessage(
          { __simScroll: true, ratio: max > 0 ? window.scrollY / max : 0 },
          "*",
        );
      });
    },
    { passive: true },
  );

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) return;
    const data = event.data as { __simScrollApply?: unknown; ratio?: unknown } | null;
    if (data?.__simScrollApply !== true || typeof data.ratio !== "number") return;
    suppressOnce = true;
    window.scrollTo({ top: Math.max(0, data.ratio * maxScroll()), behavior: "instant" });
  });
}

/**
 * Reports the colour the top of the page shows, its `theme-color` or else the first solid
 * background under the top edge, so the status bar can take it on as Safari and Chrome do.
 */
function topColorReporter() {
  const probe = document.createElement("i");
  const toRgb = (value: string): string | null => {
    probe.style.color = "";
    probe.style.color = value;
    if (!probe.style.color) return null;
    document.documentElement.appendChild(probe);
    const rgb = getComputedStyle(probe).color;
    probe.remove();
    return rgb;
  };
  const solid = (color: string) =>
    color !== "transparent" && !/,\s*0(\.0+)?\)$/.test(color) && !/\/\s*0\)$/.test(color);

  let last: string | null = null;
  const read = () => {
    let color: string | null = null;
    const meta = Array.from(
      document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'),
    ).find((m) => !m.media || window.matchMedia(m.media).matches);
    if (meta?.content) color = toRgb(meta.content);
    for (
      let node = color ? null : document.elementFromPoint(window.innerWidth / 2, 1);
      node;
      node = node.parentElement
    ) {
      const background = getComputedStyle(node).backgroundColor;
      if (solid(background)) {
        color = background;
        break;
      }
    }
    const report = color ?? "";
    if (report === last) return;
    last = report;
    window.parent.postMessage({ __simTopColor: true, color: report }, "*");
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  const later = () => {
    clearTimeout(timer);
    timer = setTimeout(read, 120);
  };
  const start = () => {
    read();
    window.addEventListener("scroll", later, { passive: true });
    new MutationObserver(later).observe(document.head, {
      childList: true,
      subtree: true,
      attributes: true,
    });
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}

// Mirrors FieldInfo in src/simulator/keyboard/layout.ts.
type FieldInfo = {
  kind: "text" | "email" | "url" | "search" | "number" | "decimal";
  enter: string;
  multiline: boolean;
};

const TEXT_TYPES = /^(text|email|url|search|tel|number|password)$/;

function isField(el: Element | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  if (el instanceof HTMLInputElement)
    return TEXT_TYPES.test(el.type) && !el.readOnly && !el.disabled;
  if (el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled;
  return el.isContentEditable;
}

function fieldInfo(el: HTMLElement): FieldInfo {
  const mode = (el.getAttribute("inputmode") ?? "").toLowerCase();
  const type = el instanceof HTMLInputElement ? el.type : "text";
  const oneTimeCode = el.getAttribute("autocomplete") === "one-time-code";
  let kind: FieldInfo["kind"] = "text";
  if (mode === "decimal") kind = "decimal";
  else if (
    mode === "numeric" ||
    mode === "tel" ||
    type === "tel" ||
    type === "number" ||
    oneTimeCode
  ) {
    kind = "number";
  } else if (mode === "email" || type === "email") kind = "email";
  else if (mode === "url" || type === "url") kind = "url";
  else if (mode === "search" || type === "search") kind = "search";
  return {
    kind,
    enter: (el.getAttribute("enterkeyhint") ?? "").toLowerCase(),
    multiline: el instanceof HTMLTextAreaElement || el.isContentEditable,
  };
}

/**
 * Tells the simulator when a text field takes or loses focus, so it can bring the on-screen
 * keyboard up or down, and types the keys pressed on that keyboard into the field.
 */
function keyboardBridge() {
  let field: HTMLElement | null = null;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  const post = (message: object) => window.parent.postMessage({ __msimKb: true, ...message }, "*");

  window.addEventListener(
    "focusin",
    (event) => {
      const target = event.target as Element | null;
      if (!isField(target)) return;
      clearTimeout(closeTimer);
      field = target;
      post({ action: "open", info: fieldInfo(target) });
    },
    true,
  );
  window.addEventListener(
    "focusout",
    () => {
      clearTimeout(closeTimer);
      // Focus may be moving on to another field.
      closeTimer = setTimeout(() => {
        if (isField(document.activeElement) && document.hasFocus()) return;
        field = null;
        post({ action: "close" });
      }, 150);
    },
    true,
  );
  window.addEventListener(
    "keydown",
    (event) => {
      if (field) post({ action: "press", key: event.key });
    },
    true,
  );

  // The page just got shorter: bring the field above the keyboard, as a phone does.
  const hidden = (el: Element) => {
    const rect = el.getBoundingClientRect();
    return rect.bottom > window.innerHeight - 8 || rect.top < 0;
  };
  const reveal = () => {
    if (field && hidden(field)) field.scrollIntoView({ block: "center", behavior: "instant" });
  };

  const fields = () =>
    Array.from(document.querySelectorAll("input, textarea, [contenteditable]")).filter(
      (el): el is HTMLElement => isField(el) && el.getClientRects().length > 0,
    );

  const type = (key: string) => {
    if (!field) return;
    if (document.activeElement !== field) field.focus({ preventScroll: true });
    clearTimeout(closeTimer);
    if (key === "Backspace") {
      document.execCommand("delete");
      return;
    }
    if (key !== "Enter") {
      document.execCommand("insertText", false, key);
      return;
    }
    const { enter, multiline } = fieldInfo(field);
    if (multiline && !enter) {
      document.execCommand("insertText", false, "\n");
      return;
    }
    if (enter === "next") {
      const list = fields();
      const next = list[list.indexOf(field) + 1];
      if (next) next.focus();
      else field.blur();
      return;
    }
    if (enter === "done") {
      field.blur();
      return;
    }
    const init = {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
    };
    const go = field.dispatchEvent(new KeyboardEvent("keydown", init));
    field.dispatchEvent(new KeyboardEvent("keyup", init));
    const form = (field as HTMLInputElement).form;
    if (go && form) form.requestSubmit();
  };

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) return;
    const data = event.data as { __msimKbKey?: unknown; __msimKbShown?: unknown } | null;
    if (typeof data?.__msimKbKey === "string") type(data.__msimKbKey);
    else if (data?.__msimKbShown === true) setTimeout(reveal, 30);
  });
}

// Mirrors SyncTarget in src/simulator/interaction-sync.ts.
type SyncTarget = { selectors: string[]; tag: string; text: string; link: boolean };

const CLICKABLE =
  'a, button, input, select, textarea, label, summary, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="checkbox"], [role="switch"], [onclick], [tabindex]';

function cssPath(el: Element): string {
  const parts: string[] = [];
  for (let node: Element | null = el; node && node !== document.documentElement;) {
    const parent: Element | null = node.parentElement;
    const tag = node.tagName.toLowerCase();
    if (!parent) {
      parts.unshift(tag);
      break;
    }
    const same = Array.from(parent.children).filter((c) => c.tagName === node!.tagName);
    parts.unshift(same.length > 1 ? `${tag}:nth-of-type(${same.indexOf(node) + 1})` : tag);
    node = parent;
  }
  return parts.join(" > ");
}

/** Ways to find the same element in another device's copy of the page, surest first. */
function describe(el: Element): SyncTarget {
  const selectors: string[] = [];
  const attr = (name: string) => {
    const value = el.getAttribute(name);
    if (value) selectors.push(`${el.tagName.toLowerCase()}[${name}="${CSS.escape(value)}"]`);
  };
  for (const name of ["data-testid", "data-test", "data-cy"]) attr(name);
  if (el.id && !/\d{4,}|:r/.test(el.id)) selectors.push(`#${CSS.escape(el.id)}`);
  for (const name of ["name", "aria-label", "placeholder", "href", "for"]) attr(name);
  selectors.push(cssPath(el));
  const anchor = el instanceof HTMLAnchorElement ? el : null;
  const href = anchor?.getAttribute("href") ?? null;
  return {
    selectors,
    tag: el.tagName.toLowerCase(),
    text: (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 80),
    link:
      !!href && !href.startsWith("#") && !/^javascript:/i.test(href) && anchor?.target !== "_blank",
  };
}

function findTarget({ selectors, tag, text }: SyncTarget): HTMLElement | null {
  for (const selector of selectors) {
    try {
      const found = document.querySelectorAll<HTMLElement>(selector);
      if (found.length === 1) return found[0];
      // A selector several elements share still decides it when the text picks one out.
      const byText = Array.from(found).find((f) => (f.textContent ?? "").trim() === text);
      if (byText) return byText;
    } catch {
      // A selector this page's CSS engine refuses.
    }
  }
  if (!text) return null;
  return (
    Array.from(document.getElementsByTagName(tag)).find(
      (el): el is HTMLElement =>
        el instanceof HTMLElement && (el.textContent ?? "").trim().replace(/\s+/g, " ") === text,
    ) ?? null
  );
}

function setNativeValue(
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
) {
  const proto = Object.getPrototypeOf(el) as object;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
}

/** Without the device tag the simulator adds, which a page's own navigation drops anyway. */
function untagged(href: string): string {
  try {
    const url = new URL(href);
    url.searchParams.delete("__sim_device");
    return url.href;
  } catch {
    return href;
  }
}

/**
 * Reports clicks, typing and page changes the person makes, and repeats the ones another device
 * reports. Events the bridge itself fires are not trusted, which keeps them from echoing back.
 */
function interactionSync() {
  const post = (message: object) => window.parent.postMessage(message, "*");

  window.addEventListener(
    "click",
    (event) => {
      if (!event.isTrusted || performance.now() - swallowedAt < 80) return;
      const origin = event.target instanceof Element ? event.target : null;
      const el = origin?.closest(CLICKABLE) ?? origin;
      if (!el || el instanceof HTMLSelectElement) return;
      // Typing fields sync their value instead; a click on them only moves the caret.
      if (
        el.matches(
          'input:not([type="checkbox"], [type="radio"], [type="submit"], [type="button"]), textarea',
        )
      )
        return;
      post({ __msimAct: { kind: "click", target: describe(el) } });
    },
    true,
  );

  const onValue = (event: Event) => {
    if (!event.isTrusted) return;
    const el = event.target;
    if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
      if (event.type !== "change") return;
      post({ __msimAct: { kind: "check", target: describe(el), checked: el.checked } });
    } else if (
      el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLSelectElement
    ) {
      if (el instanceof HTMLSelectElement ? event.type !== "change" : event.type !== "input")
        return;
      post({ __msimAct: { kind: "value", target: describe(el), value: el.value } });
    }
  };
  window.addEventListener("input", onValue, true);
  window.addEventListener("change", onValue, true);

  // `soft` is a change the page made itself without loading a new document.
  let reported = "";
  const reportUrl = (soft: boolean) => {
    const href = untagged(location.href);
    if (href === reported) return;
    reported = href;
    post({ __msimNav: { url: href, soft } });
  };
  const softChange = () => reportUrl(true);
  for (const method of ["pushState", "replaceState"] as const) {
    const original = history[method].bind(history);
    history[method] = (...args: Parameters<History["pushState"]>) => {
      original(...args);
      queueMicrotask(softChange);
    };
  }
  window.addEventListener("popstate", softChange);
  window.addEventListener("hashchange", softChange);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => reportUrl(false), { once: true });
  } else {
    reportUrl(false);
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) return;
    const data = event.data as {
      __msimActApply?: { kind: string; target: SyncTarget; value?: string; checked?: boolean };
      __msimNavApply?: { url: string; full: string; soft: boolean };
    } | null;
    const act = data?.__msimActApply;
    if (act) {
      const el = findTarget(act.target);
      if (!el) {
        post({ __msimActMissed: act.target.text || act.target.selectors.at(-1) });
        return;
      }
      if (act.kind === "click") {
        for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup"]) {
          el.dispatchEvent(
            new (type.startsWith("pointer") ? PointerEvent : MouseEvent)(type, {
              bubbles: true,
              cancelable: true,
              composed: true,
            }),
          );
        }
        el.click();
      } else if (act.kind === "check" && el instanceof HTMLInputElement) {
        if (el.checked !== act.checked) el.click();
      } else if (
        act.kind === "value" &&
        (el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement ||
          el instanceof HTMLSelectElement)
      ) {
        setNativeValue(el, act.value ?? "");
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
      return;
    }
    const nav = data?.__msimNavApply;
    if (nav && typeof nav.url === "string") {
      if (untagged(location.href) === nav.url) return;
      reported = nav.url;
      const target = new URL(nav.url);
      const sameDocument =
        target.origin === location.origin &&
        target.pathname === location.pathname &&
        target.search === new URL(untagged(location.href)).search;
      // A router's change on the same site: let the router take the new address the way the
      // back button does. Anything else loads the page afresh, with the device tag the
      // User-Agent rule looks for; only a hash change stays in the same document.
      if (sameDocument) {
        location.hash = target.hash;
      } else if (nav.soft && target.origin === location.origin) {
        history.pushState(null, "", nav.url);
        window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
      } else {
        location.href = nav.full;
      }
    }
  });
}

// Mirrors LogEntry and RequestEntry in src/simulator/devtools.ts, less the device.
type PageLog = { level: string; text: string; at: number };
type PageRequest = {
  method: string;
  url: string;
  status: number;
  type: string;
  ms: number;
  size: number;
  at: number;
  failed: boolean;
};

function formatArg(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.stack ?? `${value.name}: ${value.message}`;
  if (value instanceof Element) {
    return `<${value.tagName.toLowerCase()}${value.id ? `#${value.id}` : ""}>`;
  }
  try {
    const json = JSON.stringify(value, (_key, v: unknown) =>
      typeof v === "bigint" ? `${v}n` : typeof v === "function" ? "ƒ" : v,
    );
    return json === undefined ? String(value) : json;
  } catch {
    return String(value);
  }
}

/**
 * Passes the page's console output, uncaught errors and network requests up to the simulator's
 * console panel, a few times a second rather than one message each.
 */
function devtoolsBridge() {
  const logs: PageLog[] = [];
  const requests: PageRequest[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  const flush = () => {
    timer = undefined;
    if (logs.length === 0 && requests.length === 0) return;
    // A page logging in a tight loop only sends its latest lines.
    window.parent.postMessage(
      { __msimDev: { logs: logs.slice(-200), requests: requests.slice(-200) } },
      "*",
    );
    logs.length = 0;
    requests.length = 0;
  };
  const queue = () => {
    timer ??= setTimeout(flush, 250);
  };

  const log = (level: string, args: unknown[]) => {
    const text = args.map(formatArg).join(" ");
    logs.push({
      level,
      text: text.length > 4000 ? `${text.slice(0, 4000)}…` : text,
      at: Date.now(),
    });
    queue();
  };
  for (const level of ["log", "info", "warn", "error", "debug"] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      original(...args);
      log(level, args);
    };
  }
  window.addEventListener("error", (event) => {
    if (event.error || event.message) log("error", [event.error ?? event.message]);
  });
  window.addEventListener("unhandledrejection", (event) => {
    log("error", ["Uncaught (in promise)", event.reason]);
  });

  const request = (entry: Omit<PageRequest, "at">) => {
    requests.push({ ...entry, at: Date.now() });
    queue();
  };

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const started = performance.now();
    const method = (
      init?.method ?? (input instanceof Request ? input.method : "GET")
    ).toUpperCase();
    const url = input instanceof Request ? input.url : String(input);
    try {
      const response = await originalFetch(input, init);
      const size = Number(response.headers.get("content-length") ?? 0);
      request({
        method,
        url: response.url || url,
        status: response.status,
        type: "fetch",
        ms: performance.now() - started,
        size,
        failed: !response.ok,
      });
      return response;
    } catch (error) {
      request({
        method,
        url,
        status: 0,
        type: "fetch",
        ms: performance.now() - started,
        size: 0,
        failed: true,
      });
      throw error;
    }
  };

  const open = XMLHttpRequest.prototype.open;
  const send = XMLHttpRequest.prototype.send;
  const xhrInfo = new WeakMap<XMLHttpRequest, { method: string; url: string }>();
  XMLHttpRequest.prototype.open = function (
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ) {
    xhrInfo.set(this, { method: method.toUpperCase(), url: String(url) });
    return (open as (...args: unknown[]) => void).call(this, method, url, ...rest);
  } as typeof open;
  XMLHttpRequest.prototype.send = function (
    this: XMLHttpRequest,
    body?: Document | XMLHttpRequestBodyInit | null,
  ) {
    const started = performance.now();
    this.addEventListener("loadend", () => {
      const info = xhrInfo.get(this);
      if (!info) return;
      request({
        method: info.method,
        url: this.responseURL || new URL(info.url, location.href).href,
        status: this.status,
        type: "xhr",
        ms: performance.now() - started,
        size: Number(this.getResponseHeader("content-length") ?? 0),
        failed: this.status === 0 || this.status >= 400,
      });
    });
    return send.call(this, body);
  };

  // Everything else the page loads: scripts, styles, images, fonts. Fetches are logged above
  // with their method.
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
        if (entry.initiatorType === "fetch" || entry.initiatorType === "xmlhttprequest") continue;
        const status = entry.responseStatus ?? 0;
        request({
          method: "GET",
          url: entry.name,
          status,
          type: entry.initiatorType,
          ms: entry.duration,
          size: entry.transferSize || entry.encodedBodySize,
          failed: status >= 400,
        });
      }
    }).observe({ type: "resource", buffered: true });
  } catch {
    // No resource timing here.
  }
}

/**
 * Steps the page through a full-page screenshot for the simulator, which captures the tab at each
 * step and stitches the pieces. Fixed and sticky bars are hidden where they'd repeat: the top ones
 * after the first step, the bottom ones before the last.
 */
function fullPageBridge() {
  let scroller: Element | null = null;
  let startTop = 0;
  let bars: { el: HTMLElement; top: boolean; visibility: string }[] = [];

  const pickScroller = (): Element => {
    if (canScroll(root(), true)) return root();
    let best: Element | null = null;
    let area = 0;
    for (const el of document.querySelectorAll("body *")) {
      if (!canScroll(el, true)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width * rect.height > area) {
        best = el;
        area = rect.width * rect.height;
      }
    }
    return best ?? root();
  };

  const findBars = () => {
    const found: typeof bars = [];
    for (const el of document.querySelectorAll<HTMLElement>("body *")) {
      const position = getComputedStyle(el).position;
      if (position !== "fixed" && position !== "sticky") continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      found.push({
        el,
        top: rect.top + rect.height / 2 < window.innerHeight / 2,
        visibility: el.style.visibility,
      });
    }
    return found;
  };

  const showBars = (top: boolean, bottom: boolean) => {
    for (const bar of bars) {
      const show = bar.top ? top : bottom;
      bar.el.style.visibility = show ? bar.visibility : "hidden";
    }
  };

  const report = (id: unknown, el: Element) => {
    const isRoot = el === root();
    const rect = isRoot ? null : el.getBoundingClientRect();
    window.parent.postMessage(
      {
        __msimFullAt: {
          id,
          scroll: isRoot ? window.scrollY : el.scrollTop,
          top: rect ? Math.max(0, rect.top) : 0,
          height: rect ? Math.min(rect.height, window.innerHeight) : window.innerHeight,
          total: el.scrollHeight,
          viewport: window.innerHeight,
        },
      },
      "*",
    );
  };

  const scrollTo = (el: Element, top: number) => {
    if (el === root()) window.scrollTo({ top, behavior: "instant" });
    else el.scrollTo({ top, behavior: "instant" });
  };

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) return;
    const data = event.data as {
      __msimFull?: unknown;
      id?: unknown;
      y?: unknown;
      first?: unknown;
      last?: unknown;
    } | null;
    const step = data?.__msimFull;
    if (step === "start") {
      scroller = pickScroller();
      startTop = scroller === root() ? window.scrollY : scroller.scrollTop;
      bars = findBars();
      scrollTo(scroller, 0);
    } else if (step === "scroll" && scroller && typeof data?.y === "number") {
      scrollTo(scroller, data.y);
      showBars(data.first === true, data.last === true);
    } else if (step === "end" && scroller) {
      showBars(true, true);
      scrollTo(scroller, startTop);
      scroller = null;
      bars = [];
      return;
    } else {
      return;
    }
    const el = scroller;
    requestAnimationFrame(() => requestAnimationFrame(() => report(data?.id, el)));
  });
}

const identity = readIdentity();
if (identity) {
  devtoolsBridge();
  fullPageBridge();
  if (identity.ua && identity.platform) spoofIdentity({ ...identity, ua: identity.ua });
  hideScrollbars(!identity.scrollbars);
  touchMode(identity.touch);
  pwaReporter();
  recordingCursor();
  activityReporter();
  forwardShortcuts();
  scrollBridge();
  topColorReporter();
  keyboardBridge();
  interactionSync();
}

// Keeps the names above out of the global scope while type-checking. The build wraps the file
// in a function, which drops this line.
export {};
