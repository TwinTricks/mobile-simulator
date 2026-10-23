import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useIdleStop } from "./use-idle-stop";

describe("useIdleStop", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("calls back once the minutes pass with nothing happening", () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleStop(true, 2, onIdle));
    vi.advanceTimersByTime(119_000);
    expect(onIdle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2_000);
    expect(onIdle).toHaveBeenCalled();
  });

  it("starts the wait again on a key, a pointer move or a page's report", () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleStop(true, 1, onIdle));
    vi.advanceTimersByTime(50_000);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    vi.advanceTimersByTime(50_000);
    window.dispatchEvent(new Event("pointermove"));
    vi.advanceTimersByTime(50_000);
    window.dispatchEvent(new MessageEvent("message", { data: { __msimActive: true } }));
    vi.advanceTimersByTime(50_000);
    expect(onIdle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(11_000);
    expect(onIdle).toHaveBeenCalled();
  });

  it("never calls back when off, or while not recording", () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleStop(true, 0, onIdle));
    renderHook(() => useIdleStop(false, 1, onIdle));
    vi.advanceTimersByTime(10 * 60_000);
    expect(onIdle).not.toHaveBeenCalled();
  });
});
