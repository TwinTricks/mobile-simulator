import { useCallback, useEffect, useRef, useState } from "react";

import type { RecordingSettings } from "@/shared/types";
import { settle } from "../screenshot/capture";
import {
  RecordingCancelled,
  captureTab,
  pickFormat,
  startRecorder,
  type Capture,
  type Recording,
} from "./recorder";
import { QUALITY } from "./studio";

export type RecorderPhase =
  | { phase: "idle" }
  | { phase: "asking" }
  | { phase: "countdown"; left: number }
  | { phase: "recording"; startedAt: number }
  | { phase: "finishing" }
  | { phase: "review"; recording: Recording };

const TICK_MS = 250;
const CLEAR_MS = 200;

/**
 * Screen recording of the simulator: Chrome asks to share the tab, a countdown runs, then the
 * video records until stopped and comes back for review.
 */
export function useRecorder({
  options,
  target,
  background = null,
  onWarning,
}: {
  options: RecordingSettings;
  /** What the video is cropped to, looked up when recording starts. */
  target: () => Element | null;
  /** The colour of any bars around the video; by default the colour behind the target. */
  background?: string | null;
  onWarning: (text: string, key: string) => void;
}) {
  const [state, setState] = useState<RecorderPhase>({ phase: "idle" });
  const [now, setNow] = useState(0);
  const capture = useRef<Capture | null>(null);
  const recorder = useRef<{ stop: () => Promise<Recording> } | null>(null);
  // Bumped to call off a start that is still asking or counting down.
  const attempt = useRef(0);
  const phase = useRef(state.phase);
  useEffect(() => {
    phase.current = state.phase;
  });

  const release = useCallback(() => {
    capture.current?.release();
    capture.current = null;
    recorder.current = null;
  }, []);

  const stop = useCallback(async () => {
    const running = recorder.current;
    if (!running) {
      // Not recording yet: whatever was starting is called off.
      attempt.current += 1;
      release();
      if (phase.current !== "review") setState({ phase: "idle" });
      return;
    }
    recorder.current = null;
    setState({ phase: "finishing" });
    const recording = await running.stop();
    release();
    setState(recording.blob.size > 0 ? { phase: "review", recording } : { phase: "idle" });
  }, [release]);

  const start = useCallback(async () => {
    if (phase.current !== "idle") return;
    const element = target();
    if (!element) return;
    const format =
      typeof MediaRecorder === "undefined"
        ? null
        : pickFormat((type) => MediaRecorder.isTypeSupported(type));
    if (!format || !navigator.mediaDevices?.getDisplayMedia) {
      onWarning("This browser can't record video.", "record-unsupported");
      return;
    }

    const mine = ++attempt.current;
    phase.current = "asking";
    setState({ phase: "asking" });
    let taken: Capture;
    try {
      taken = await captureTab(element, {
        microphone: options.microphone,
        microphoneId: options.microphoneId,
        frameRate: QUALITY[options.quality].frameRate,
        background,
      });
    } catch (reason) {
      if (attempt.current === mine) setState({ phase: "idle" });
      if (!(reason instanceof RecordingCancelled)) {
        const message = reason instanceof Error ? reason.message : String(reason);
        onWarning(`The recording couldn't start: ${message}`, "record-failed");
      }
      return;
    }
    if (attempt.current !== mine) {
      taken.release();
      return;
    }
    capture.current = taken;
    if (taken.microphoneError) onWarning(taken.microphoneError, "record-microphone");
    if (!taken.cropped) {
      onWarning(
        "The video couldn't be cropped to the devices, so it shows everything that was shared.",
        "record-uncropped",
      );
    }
    // Stopping the share from Chrome's own bar ends the recording, or calls off the countdown.
    taken.stream.getVideoTracks()[0]?.addEventListener("ended", () => void stop(), { once: true });

    for (let left = options.countdown; left > 0; left--) {
      setState({ phase: "countdown", left });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (attempt.current !== mine) return;
    }
    // The countdown has to leave the captured picture too, not just the screen: the capture only
    // sends a frame when the tab changes, so the recorder would start on the last one with it.
    setState({ phase: "recording", startedAt: performance.now() });
    await settle(CLEAR_MS);
    if (attempt.current !== mine) return;
    const box = element.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    const running = await startRecorder(
      taken,
      format,
      { width: box.width * scale, height: box.height * scale },
      QUALITY[options.quality].bitsPerPixel,
    );
    if (attempt.current !== mine) {
      void running.stop();
      return;
    }
    recorder.current = running;
    setState({ phase: "recording", startedAt: performance.now() });
  }, [
    target,
    options.microphone,
    options.microphoneId,
    options.countdown,
    options.quality,
    background,
    onWarning,
    stop,
  ]);

  // Set ahead of the render too, so a new start can follow in the same click.
  const discard = useCallback(() => {
    phase.current = "idle";
    setState({ phase: "idle" });
  }, []);

  useEffect(() => {
    if (state.phase !== "recording") return;
    setNow(performance.now());
    const timer = setInterval(() => setNow(performance.now()), TICK_MS);
    return () => clearInterval(timer);
  }, [state.phase]);

  useEffect(
    () => () => {
      attempt.current += 1;
      release();
    },
    [release],
  );

  const elapsedMs = state.phase === "recording" ? Math.max(0, now - state.startedAt) : 0;
  return { state, elapsedMs, start, stop, discard };
}
