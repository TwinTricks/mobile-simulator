import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Everything below stubs a browser API. A spec that opts into the node
// environment (`// @vitest-environment node`) has no `window` to define them on.
const isBrowserLike = typeof window !== "undefined";

// RTL does not auto-clean when `globals: true` is set via a Vitest config
// rather than the CLI, so unmount explicitly between tests.
afterEach(() => {
  if (isBrowserLike) cleanup();
});

// ---------------------------------------------------------------------------
// Browser APIs jsdom does not implement. Radix UI and similar libraries touch
// these on mount, so a missing stub surfaces as an unrelated TypeError.
// ---------------------------------------------------------------------------

class MockObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
}

if (isBrowserLike) {
  // A plain function, not `vi.fn()`, which `restoreMocks` would empty between tests.
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });

  vi.stubGlobal("IntersectionObserver", MockObserver);
  vi.stubGlobal("ResizeObserver", MockObserver);

  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = vi.fn(() => false);
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
  }
}
