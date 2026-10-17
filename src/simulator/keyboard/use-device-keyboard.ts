import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import { keyForPress, type FieldInfo, type KeyLayer, type KeyboardOs } from "./layout";

// As on a phone, the page gives up its space once the keyboard has slid up.
const RAISE_MS = 260;
const PRESS_FLASH_MS = 140;

const TEXT_FIELD: FieldInfo = { kind: "text", enter: "", multiline: false };

type KeyboardMessage =
  | { __msimKb: true; action: "open"; info: FieldInfo }
  | { __msimKb: true; action: "close" }
  | { __msimKb: true; action: "press"; key: string };

const SPECIAL_VALUES: Record<string, string> = {
  backspace: "Backspace",
  enter: "Enter",
  space: " ",
};

/**
 * The on-screen keyboard of one device: up while a text field in its page has focus, down
 * otherwise. `os` null keeps it down for good. `resetKey` changing (a new page) brings it down.
 */
export function useDeviceKeyboard(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  os: KeyboardOs | null,
  resetKey: unknown,
) {
  const [open, setOpen] = useState(false);
  const [raised, setRaised] = useState(false);
  const [info, setInfo] = useState<FieldInfo>(TEXT_FIELD);
  const [layer, setLayer] = useState<KeyLayer>("abc");
  const [shift, setShift] = useState(false);
  const [pressed, setPressed] = useState<string | null>(null);
  const raiseTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // The message listener is added once per page, so it reads these through refs.
  const shiftRef = useRef(shift);
  const infoRef = useRef(info);
  useEffect(() => {
    shiftRef.current = shift;
    infoRef.current = info;
  });

  const close = useCallback(() => {
    clearTimeout(raiseTimer.current);
    setOpen(false);
    setRaised(false);
  }, []);

  const flash = useCallback((key: string) => {
    if (!key) return;
    setPressed(key);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setPressed(null), PRESS_FLASH_MS);
  }, []);

  useEffect(close, [resetKey, os, close]);

  useEffect(() => {
    if (!os) return;
    const onMessage = (event: MessageEvent) => {
      const frame = iframeRef.current?.contentWindow;
      if (!frame || event.source !== frame) return;
      const data = event.data as KeyboardMessage | null;
      if (data?.__msimKb !== true) return;
      if (data.action === "close") {
        close();
      } else if (data.action === "press") {
        flash(keyForPress(data.key, shiftRef.current));
      } else {
        // A different kind of field starts over on letters; the same one keeps its layer.
        if (JSON.stringify(infoRef.current) !== JSON.stringify(data.info)) {
          setLayer("abc");
          setShift(false);
        }
        setInfo(data.info);
        setOpen(true);
        clearTimeout(raiseTimer.current);
        raiseTimer.current = setTimeout(() => {
          setRaised(true);
          frame.postMessage({ __msimKbShown: true }, "*");
        }, RAISE_MS);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [iframeRef, os, close, flash]);

  useEffect(
    () => () => {
      clearTimeout(raiseTimer.current);
      clearTimeout(flashTimer.current);
    },
    [],
  );

  function pressKey(key: string) {
    flash(key);
    if (key === "shift") {
      setShift((on) => !on);
      return;
    }
    if (key.startsWith("layer:")) {
      setLayer(key.slice("layer:".length) as KeyLayer);
      setShift(false);
      return;
    }
    if (key === "emoji") return;
    const value = SPECIAL_VALUES[key] ?? key;
    iframeRef.current?.contentWindow?.postMessage({ __msimKbKey: value }, "*");
    if (shift && key.length === 1) setShift(false);
  }

  return { open: open && !!os, raised: raised && !!os, info, layer, shift, pressed, pressKey };
}
