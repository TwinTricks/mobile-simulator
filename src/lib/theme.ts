import type { ThemeChoice } from "@/shared/types";

/**
 * The last choice, kept where it can be read before the first paint.
 *
 * The real setting lives in `chrome.storage`, which only answers asynchronously: long enough for
 * a light page to flash in front of someone who asked for a dark one.
 */
const CACHE_KEY = "mobile-simulator:theme";

const CHOICES: ThemeChoice[] = ["system", "light", "dark"];

export function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(choice: ThemeChoice): void {
  const dark = choice === "dark" || (choice === "system" && prefersDark());
  document.documentElement.classList.toggle("dark", dark);
  // Scrollbars, form controls and the window behind them are the browser's to draw.
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export function cachedTheme(): ThemeChoice {
  try {
    const stored = window.localStorage.getItem(CACHE_KEY) as ThemeChoice | null;
    return stored && CHOICES.includes(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export function cacheTheme(choice: ThemeChoice): void {
  try {
    window.localStorage.setItem(CACHE_KEY, choice);
  } catch {
    // A page that cannot cache the choice still honours it. Only the flash comes back.
  }
}

/** The value after `current` in `order`, wrapping round at the end. */
export function nextInCycle<T>(order: readonly T[], current: T): T {
  return order[(order.indexOf(current) + 1) % order.length];
}
