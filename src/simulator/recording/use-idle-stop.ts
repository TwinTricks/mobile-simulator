import { useEffect, useRef } from "react";

const EVENTS = ["pointermove", "pointerdown", "keydown", "wheel"] as const;

/**
 * Calls `onIdle` once `minutes` pass with no click, key, scroll or pointer move, over the
 * simulator or inside the devices' pages, while `active`. 0 minutes never does.
 */
export function useIdleStop(active: boolean, minutes: number, onIdle: () => void): void {
  const idle = useRef(onIdle);
  useEffect(() => {
    idle.current = onIdle;
  }, [onIdle]);

  useEffect(() => {
    if (!active || minutes <= 0) return;
    let last = Date.now();
    const bump = () => {
      last = Date.now();
    };
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { __msimActive?: unknown; __msimPointer?: unknown } | null;
      if (data?.__msimActive || data?.__msimPointer) bump();
    };
    // Pages loaded since the last call are told too.
    const watch = (on: boolean) =>
      document
        .querySelectorAll("iframe")
        .forEach((frame) => frame.contentWindow?.postMessage({ __msimWatch: on }, "*"));

    for (const type of EVENTS)
      window.addEventListener(type, bump, { capture: true, passive: true });
    window.addEventListener("message", onMessage);
    watch(true);
    const timer = setInterval(() => {
      watch(true);
      if (Date.now() - last >= minutes * 60_000) idle.current();
    }, 1000);
    return () => {
      clearInterval(timer);
      watch(false);
      for (const type of EVENTS) window.removeEventListener(type, bump, { capture: true });
      window.removeEventListener("message", onMessage);
    };
  }, [active, minutes]);
}
