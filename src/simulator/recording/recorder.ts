import { sendRequest } from "@/shared/messages";

// Region Capture isn't in TypeScript's DOM types yet.
type CropTarget = object;
declare global {
  interface Window {
    CropTarget?: { fromElement(element: Element): Promise<CropTarget> };
  }
}
type CroppableTrack = MediaStreamTrack & { cropTo?: (target: CropTarget | null) => Promise<void> };
// Nor are Insertable Streams, which Chrome has on windows as well as in workers.
declare class MediaStreamTrackProcessor {
  constructor(init: { track: MediaStreamTrack });
  readonly readable: ReadableStream<VideoFrame>;
}

export type VideoFormat = { mimeType: string; extension: "mp4" | "webm" };

// MP4 first: it plays everywhere and goes straight into a slide deck or a bug report.
const FORMATS: VideoFormat[] = [
  { mimeType: "video/mp4;codecs=avc1.640028,mp4a.40.2", extension: "mp4" },
  { mimeType: "video/mp4;codecs=avc1,mp4a.40.2", extension: "mp4" },
  { mimeType: "video/mp4", extension: "mp4" },
  { mimeType: "video/webm;codecs=vp9,opus", extension: "webm" },
  { mimeType: "video/webm", extension: "webm" },
];

/** The best format this browser's MediaRecorder can write, or null when it can write none. */
export function pickFormat(isSupported: (mimeType: string) => boolean): VideoFormat | null {
  return FORMATS.find((format) => isSupported(format.mimeType)) ?? null;
}

/** `m:ss`, or `h:mm:ss` past an hour. */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const seconds = String(total % 60).padStart(2, "0");
  const minutes = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600);
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`
    : `${minutes}:${seconds}`;
}

export class RecordingCancelled extends Error {
  constructor() {
    super("The recording was cancelled.");
  }
}

export type Capture = {
  stream: MediaStream;
  /** The colour behind what is recorded. */
  background: string;
  /** Set when the microphone was asked for but couldn't be had. */
  microphoneError: string | null;
  /** False when the video couldn't be cropped: an older Chrome, or a window or screen was shared. */
  cropped: boolean;
  /** Where to cut what is recorded out of each frame, in CSS pixels; null when Chrome crops. */
  region: (() => DOMRect) | null;
  /** Stops every track and audio node the capture holds. */
  release: () => void;
};

/**
 * Asks to share this tab, crops the video to `target`, and adds the microphone and the tab's own
 * sound when there are any. Chrome asks the user first; saying no throws `RecordingCancelled`.
 */
export async function captureTab(
  target: Element,
  {
    microphone,
    microphoneId = "",
    frameRate,
    background,
  }: {
    microphone: boolean;
    microphoneId?: string;
    frameRate: number;
    background?: string | null;
  },
): Promise<Capture> {
  // The tab itself without asking, which the extension may do for its own page; Chrome's share
  // prompt where it can't.
  const own = await captureOwnTab(frameRate);
  const display = own ?? (await askToShare(frameRate));

  const video = display.getVideoTracks()[0] as CroppableTrack | undefined;
  if (!video) {
    display.getTracks().forEach((t) => t.stop());
    throw new Error("Chrome shared no video.");
  }
  let cropped = false;
  if (window.CropTarget && video.cropTo) {
    try {
      await video.cropTo(await window.CropTarget.fromElement(target));
      cropped = true;
    } catch {
      // Not croppable at the source: the tab is cropped frame by frame instead, below.
    }
  }

  const held: MediaStreamTrack[] = [...display.getTracks()];
  // Capturing a tab's sound silences it, so it is played on as well.
  let player: AudioContext | null = null;
  if (own && display.getAudioTracks().length > 0) {
    player = new AudioContext();
    player.createMediaStreamSource(display).connect(player.destination);
  }
  const voices = display.getAudioTracks();
  let microphoneError: string | null = null;
  if (microphone) {
    try {
      const mic = await navigator.mediaDevices.getUserMedia({
        audio: {
          ...(microphoneId ? { deviceId: { exact: microphoneId } } : {}),
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      held.push(...mic.getTracks());
      voices.push(...mic.getAudioTracks());
    } catch (reason) {
      microphoneError =
        reason instanceof DOMException && reason.name === "NotAllowedError"
          ? "The microphone wasn't allowed, so the recording has no voice."
          : "No microphone could be opened, so the recording has no voice.";
    }
  }

  // MediaRecorder writes only the first audio track it is given, so the tab and the voice are
  // mixed into one.
  let audio: MediaStreamTrack[] = voices;
  let mixer: AudioContext | null = null;
  if (voices.length > 1) {
    mixer = new AudioContext();
    const out = mixer.createMediaStreamDestination();
    for (const track of voices)
      mixer.createMediaStreamSource(new MediaStream([track])).connect(out);
    audio = out.stream.getAudioTracks();
  }

  return {
    stream: new MediaStream([video, ...audio]),
    background: background ?? backgroundBehind(target),
    microphoneError,
    // This tab, whole: what is recorded is cut out of each frame.
    region: !cropped && own ? () => target.getBoundingClientRect() : null,
    cropped: cropped || !!own,
    release: () => {
      held.forEach((t) => t.stop());
      audio.forEach((t) => t.stop());
      void mixer?.close();
      void player?.close();
    },
  };
}

/** This tab's picture and sound, without Chrome's prompt, or null where that isn't allowed. */
async function captureOwnTab(frameRate: number): Promise<MediaStream | null> {
  if (typeof chrome === "undefined" || !chrome.runtime?.id) return null;
  try {
    const response = await sendRequest({ type: "tab-capture" });
    if (!response.ok || !response.streamId) return null;
    const id = response.streamId;
    const scale = window.devicePixelRatio || 1;
    const source = { chromeMediaSource: "tab", chromeMediaSourceId: id };
    return await navigator.mediaDevices.getUserMedia({
      audio: { mandatory: source },
      video: {
        mandatory: {
          ...source,
          // Pinned to the tab's own pixels: without a minimum Chrome sends it small and soft.
          minWidth: Math.round(window.innerWidth * scale),
          maxWidth: Math.round(window.innerWidth * scale),
          minHeight: Math.round(window.innerHeight * scale),
          maxHeight: Math.round(window.innerHeight * scale),
          maxFrameRate: frameRate,
        },
      },
    } as unknown as MediaStreamConstraints);
  } catch {
    return null;
  }
}

async function askToShare(frameRate: number): Promise<MediaStream> {
  const scale = window.devicePixelRatio || 1;
  try {
    return await navigator.mediaDevices.getDisplayMedia({
      // As big as the screen, or Chrome shares the tab at about 720p and the crop of that is soft.
      video: {
        frameRate: { ideal: frameRate },
        width: { ideal: Math.round(screen.width * scale) },
        height: { ideal: Math.round(screen.height * scale) },
      },
      audio: true,
      preferCurrentTab: true,
      selfBrowserSurface: "include",
      surfaceSwitching: "exclude",
    } as DisplayMediaStreamOptions);
  } catch (reason) {
    if (reason instanceof DOMException && reason.name === "NotAllowedError") {
      throw new RecordingCancelled();
    }
    throw reason;
  }
}

/** The first colour painted behind `element`, for the bars around a video that changes shape. */
function backgroundBehind(element: Element): string {
  for (let at: Element | null = element.parentElement; at; at = at.parentElement) {
    const color = getComputedStyle(at).backgroundColor;
    if (color && color !== "transparent" && !/rgba\(.*,\s*0\)$/.test(color)) return color;
  }
  return "#ffffff";
}

// How long to wait for the first cropped frame before going on without its size.
const FIRST_FRAME_MS = 1000;

/**
 * Redraws `track` onto a canvas that keeps the size of its first frame. Turning a device changes
 * the shape of what is cropped, and Chrome's MP4 recorder stops writing frames when the size
 * changes; on the canvas the device turns inside a picture that stays put.
 */
async function steadyVideo(
  track: MediaStreamTrack,
  background: string,
  fallback: { width: number; height: number },
  region: (() => DOMRect) | null,
): Promise<{ track: MediaStreamTrack; width: number; height: number; stop: () => void }> {
  // A copy, so stopping the reader leaves the shared tab's own track alone.
  const copy = track.clone();
  const reader = new MediaStreamTrackProcessor({ track: copy }).readable.getReader();
  const first = await Promise.race([
    reader.read().then((result) => result.value ?? null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), FIRST_FRAME_MS)),
  ]);

  // H.264 wants an even width and height.
  const even = (n: number) => Math.max(2, Math.floor(n / 2) * 2);
  const canvas = document.createElement("canvas");
  // The part of a frame that is recorded: all of it, or the region scaled to the frame's pixels.
  const part = (frame: { displayWidth: number; displayHeight: number }) => {
    if (!region) return { x: 0, y: 0, width: frame.displayWidth, height: frame.displayHeight };
    const rect = region();
    const scale = frame.displayWidth / window.innerWidth;
    const x = Math.max(0, rect.left * scale);
    const y = Math.max(0, rect.top * scale);
    return {
      x,
      y,
      width: Math.max(1, Math.min(frame.displayWidth - x, rect.width * scale)),
      height: Math.max(1, Math.min(frame.displayHeight - y, rect.height * scale)),
    };
  };
  // A tab capture starts on small frames and sharpens, so a region is sized from the page.
  const size = region ? fallback : first ? part(first) : fallback;
  canvas.width = even(size.width);
  canvas.height = even(size.height);
  const context = canvas.getContext("2d", { alpha: false })!;

  const draw = (frame: VideoFrame) => {
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const from = part(frame);
    const scale = Math.min(canvas.width / from.width, canvas.height / from.height);
    const width = from.width * scale;
    const height = from.height * scale;
    context.drawImage(
      frame,
      from.x,
      from.y,
      from.width,
      from.height,
      (canvas.width - width) / 2,
      (canvas.height - height) / 2,
      width,
      height,
    );
    frame.close();
  };

  let running = true;
  void (async () => {
    if (first) {
      draw(first);
    } else {
      context.fillStyle = background;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    while (running) {
      const { value, done } = await reader.read();
      if (done || !value) break;
      if (running) draw(value);
      else value.close();
    }
  })();

  const out = canvas.captureStream().getVideoTracks()[0]!;
  return {
    track: out,
    width: canvas.width,
    height: canvas.height,
    stop: () => {
      running = false;
      void reader.cancel();
      copy.stop();
      out.stop();
    },
  };
}

export type Recording = { blob: Blob; format: VideoFormat; durationMs: number };

/**
 * Records a capture until `stop` is called. `size` is used for the video when the capture sends
 * no frame to measure.
 */
export async function startRecorder(
  capture: Capture,
  format: VideoFormat,
  size: { width: number; height: number },
  bitsPerPixel = 8,
): Promise<{ stop: () => Promise<Recording> }> {
  const source = capture.stream.getVideoTracks()[0]!;
  const steady = await steadyVideo(source, capture.background, size, capture.region);
  const { width, height } = steady;
  const stream = new MediaStream([steady.track, ...capture.stream.getAudioTracks()]);
  const recorder = new MediaRecorder(stream, {
    mimeType: format.mimeType,
    // Bits a second for every pixel: eight gives sharp text without huge files.
    videoBitsPerSecond: Math.min(40_000_000, Math.max(1_500_000, width * height * bitsPerPixel)),
    audioBitsPerSecond: 128_000,
  });
  const chunks: Blob[] = [];
  const started = performance.now();
  let stopped: Promise<Recording> | null = null;

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  recorder.start(1000);

  return {
    stop: () => {
      stopped ??= new Promise<Recording>((resolve) => {
        const durationMs = performance.now() - started;
        const finish = () => {
          steady.stop();
          resolve({ blob: new Blob(chunks, { type: format.mimeType }), format, durationMs });
        };
        if (recorder.state === "inactive") {
          finish();
          return;
        }
        recorder.onstop = finish;
        recorder.stop();
      });
      return stopped;
    },
  };
}
