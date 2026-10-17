import { useEffect, useRef, useState, type MutableRefObject, type RefObject } from "react";

import { cn } from "@/lib/utils";
import type { RecordRatio, RecordingSettings } from "@/shared/types";
import { cursorUrl, findCursor } from "../recording/cursors";
import {
  cameraBubble,
  edgesOf,
  studioBox,
  unionRect,
  type BoxEdges,
  type Rect,
} from "../recording/studio";

const MIN_BOX = 80;

/** What a studio video is framed around: every device's frame, or only their screens. */
export function studioContent(crop: "frame" | "screen"): Rect | null {
  const parts = document.querySelectorAll(
    crop === "screen" ? "[data-device-id] [data-screen]" : "[data-device-id] [data-device-body]",
  );
  return unionRect([...parts].map((part) => part.getBoundingClientRect()));
}

/**
 * Moves the studio box over what a studio video shows: the devices with room around them, in
 * the video's shape. It is what the video is cropped to, so it follows the devices as they turn
 * or the stage scrolls.
 */
export function placeStudioBox(
  box: HTMLElement,
  options: { crop: "frame" | "screen"; ratio: RecordRatio; size: number; custom: BoxEdges },
  stage: Element,
): void {
  const content = studioContent(options.crop);
  if (!content) return;
  // Held off the stage's edges, so the custom box's handles stay whole.
  const s = stage.getBoundingClientRect();
  const bounds = { left: s.left + 8, top: s.top + 8, width: s.width - 16, height: s.height - 16 };
  place(
    box,
    studioBox(content, options.ratio, bounds, {
      size: options.size,
      custom: options.custom,
    }),
  );
}

function place(element: HTMLElement, rect: Rect) {
  const style = element.style;
  const set = (key: "left" | "top" | "width" | "height", value: number) => {
    const px = `${value}px`;
    if (style[key] !== px) style[key] = px;
  };
  set("left", rect.left);
  set("top", rect.top);
  set("width", rect.width);
  set("height", rect.height);
}

const RATIO_LABEL: Record<RecordRatio, string> = {
  auto: "Auto",
  "16:9": "16:9",
  "4:3": "4:3",
  "1:1": "1:1",
  "9:16": "9:16",
  custom: "Custom",
};

type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw" | "move";
const HANDLES: Exclude<Handle, "move">[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const HANDLE_SPOT: Record<Exclude<Handle, "move">, string> = {
  nw: "-top-1.5 -left-1.5 cursor-nwse-resize",
  n: "-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize",
  ne: "-top-1.5 -right-1.5 cursor-nesw-resize",
  e: "top-1/2 -right-1.5 -translate-y-1/2 cursor-ew-resize",
  se: "-right-1.5 -bottom-1.5 cursor-nwse-resize",
  s: "-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize",
  sw: "-bottom-1.5 -left-1.5 cursor-nesw-resize",
  w: "top-1/2 -left-1.5 -translate-y-1/2 cursor-ew-resize",
};

/**
 * The studio drawn over the stage: the box a studio video is cropped to (outlined, and with
 * handles for a custom size, until recording starts), the webcam bubble, and the cursor drawn
 * into the video while recording.
 */
export function RecordingStudio({
  open,
  live,
  studio,
  options,
  boxRef,
  customRef,
  target,
  onCustomBox,
  onCameraError,
}: {
  /** The studio is set up on screen. */
  open: boolean;
  /** A recording is being set up or made. */
  live: boolean;
  /** The video is framed by the box rather than cropped tight to the devices. */
  studio: boolean;
  options: RecordingSettings;
  boxRef: RefObject<HTMLDivElement | null>;
  /** The custom box's edges, changed while its handles are dragged. */
  customRef: MutableRefObject<BoxEdges>;
  /** What the video shows; it places the studio box when called. */
  target: () => Element | null;
  onCustomBox: (edges: BoxEdges) => void;
  onCameraError: (text: string) => void;
}) {
  const bubble = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const errorRef = useRef(onCameraError);
  useEffect(() => {
    errorRef.current = onCameraError;
  });
  const showing = open || live;

  useEffect(() => {
    if (!showing || !options.camera) return;
    let cancelled = false;
    let opened: MediaStream | null = null;
    navigator.mediaDevices
      ?.getUserMedia({
        video: {
          ...(options.cameraId ? { deviceId: { exact: options.cameraId } } : {}),
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
      })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        opened = s;
        setStream(s);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        errorRef.current(
          reason instanceof DOMException && reason.name === "NotAllowedError"
            ? "Camera access was blocked, so the recording has no camera bubble."
            : "No camera could be opened, so the recording has no camera bubble.",
        );
      });
    return () => {
      cancelled = true;
      opened?.getTracks().forEach((t) => t.stop());
      setStream(null);
    };
  }, [showing, options.camera, options.cameraId]);

  useEffect(() => {
    if (video.current) video.current.srcObject = stream;
  }, [stream]);

  useEffect(() => {
    if (!showing) return;
    let frame = 0;
    const tick = () => {
      const area = target()?.getBoundingClientRect();
      if (area && bubble.current) place(bubble.current, cameraBubble(area));
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [showing, target]);

  const custom = options.ratio === "custom";

  function startDrag(handle: Handle, event: React.PointerEvent) {
    const box = boxRef.current;
    const content = studioContent(options.crop);
    if (!box || !content) return;
    event.preventDefault();
    event.stopPropagation();
    const start = box.getBoundingClientRect();
    const x0 = event.clientX;
    const y0 = event.clientY;
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - x0;
      const dy = e.clientY - y0;
      let { left, top } = start;
      let right = start.right;
      let bottom = start.bottom;
      if (handle === "move") {
        left += dx;
        right += dx;
        top += dy;
        bottom += dy;
      } else {
        if (handle.includes("w")) left = Math.min(left + dx, right - MIN_BOX);
        if (handle.includes("e")) right = Math.max(right + dx, left + MIN_BOX);
        if (handle.includes("n")) top = Math.min(top + dy, bottom - MIN_BOX);
        if (handle.includes("s")) bottom = Math.max(bottom + dy, top + MIN_BOX);
      }
      customRef.current = edgesOf(
        { left, top, width: right - left, height: bottom - top },
        content,
      );
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      onCustomBox(customRef.current);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <>
      {studio && (
        <div
          ref={boxRef}
          data-record-box
          aria-label={open && !live ? `Recording area, ${RATIO_LABEL[options.ratio]}` : undefined}
          role={open && !live ? "region" : undefined}
          className={cn(
            "pointer-events-none fixed top-0 left-0 z-30 size-0",
            open && !live && "outline-2 outline-offset-0 outline-white/90 outline-dashed",
          )}
          style={open && !live ? { boxShadow: "0 0 0 1px rgba(0,0,0,.15)" } : undefined}
        >
          {open && !live && (
            <>
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 rounded-md bg-zinc-900/85 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-white shadow-sm">
                {RATIO_LABEL[options.ratio]}
              </span>
              {custom && (
                <>
                  <span
                    aria-hidden
                    className="pointer-events-auto absolute inset-3 cursor-move"
                    onPointerDown={(e) => startDrag("move", e)}
                  />
                  {HANDLES.map((handle) => (
                    <span
                      key={handle}
                      role="button"
                      aria-label={`Resize the recording area (${handle})`}
                      data-handle={handle}
                      className={cn(
                        "pointer-events-auto absolute size-3 rounded-[3px] border border-zinc-900/40 bg-white shadow",
                        HANDLE_SPOT[handle],
                      )}
                      onPointerDown={(e) => startDrag(handle, e)}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}
      {showing && options.camera && stream && (
        <div
          ref={bubble}
          data-camera-bubble
          aria-label="Camera"
          role="img"
          className="pointer-events-none fixed z-[55] overflow-hidden rounded-full border-[3px] border-white bg-black shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
        >
          <video
            ref={video}
            autoPlay
            muted
            playsInline
            className="size-full -scale-x-100 object-cover"
          />
        </div>
      )}
      {live && <DrawnCursor cursorId={options.cursor} />}
    </>
  );
}

type Ripple = { id: number; x: number; y: number };

/**
 * The cursor drawn while recording, over the simulator and inside the devices' pages alike, and
 * a ring where it clicks. The pages report the pointer, since the simulator can't see into them.
 */
function DrawnCursor({ cursorId }: { cursorId: string }) {
  const cursor = findCursor(cursorId);
  const element = useRef<HTMLImageElement>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    if (!cursor) return;
    const html = document.documentElement;
    html.dataset.recCursor = "";
    const frames = () => [...document.querySelectorAll("iframe")];
    const tell = (on: boolean) =>
      frames().forEach((f) => f.contentWindow?.postMessage({ __msimCursor: on }, "*"));
    tell(true);

    const move = (x: number, y: number) => {
      const img = element.current;
      if (!img) return;
      img.style.transform = `translate(${x - cursor.hotX}px, ${y - cursor.hotY}px)`;
      img.style.opacity = "1";
    };
    const ripple = (x: number, y: number) => {
      const id = ++nextId.current;
      setRipples((r) => [...r, { id, x, y }]);
      setTimeout(() => setRipples((r) => r.filter((one) => one.id !== id)), 500);
    };
    const onMove = (e: PointerEvent) => move(e.clientX, e.clientY);
    const onDown = (e: PointerEvent) => ripple(e.clientX, e.clientY);
    const onMessage = (event: MessageEvent) => {
      const at = (event.data as { __msimPointer?: { x: number; y: number; down: boolean } } | null)
        ?.__msimPointer;
      if (!at) return;
      const frame = frames().find((f) => f.contentWindow === event.source);
      if (!frame) return;
      const box = frame.getBoundingClientRect();
      const scale = frame.clientWidth ? box.width / frame.clientWidth : 1;
      const x = box.left + frame.clientLeft * scale + at.x * scale;
      const y = box.top + frame.clientTop * scale + at.y * scale;
      move(x, y);
      if (at.down) ripple(x, y);
    };
    window.addEventListener("pointermove", onMove, true);
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("message", onMessage);
    return () => {
      delete html.dataset.recCursor;
      tell(false);
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("message", onMessage);
    };
  }, [cursor]);

  if (!cursor) return null;
  return (
    <>
      {ripples.map((r) => (
        <span
          key={r.id}
          aria-hidden
          className="animate-click-ripple pointer-events-none fixed z-[2147483646] size-10 rounded-full border-2 border-white/90 bg-black/10"
          style={{ left: r.x - 20, top: r.y - 20 }}
        />
      ))}
      <img
        ref={element}
        src={cursorUrl(cursor)}
        alt=""
        data-drawn-cursor
        draggable={false}
        className="pointer-events-none fixed top-0 left-0 z-[2147483647] opacity-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] select-none"
        style={{ width: cursor.size, height: cursor.size }}
      />
    </>
  );
}
