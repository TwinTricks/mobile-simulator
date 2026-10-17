import { useEffect, useMemo, useRef, useState } from "react";
import { Download, ImagePlay, RotateCcw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { videoToGif } from "../recording/gif";
import { formatElapsed, type Recording } from "../recording/recorder";
import { shotFileName } from "../screenshot/compose";

type RecordingDialogProps = {
  recording: Recording;
  url: string;
  deviceNames: readonly string[];
  onRecordAgain: () => void;
  onClose: () => void;
};

function megabytes(bytes: number): string {
  const mb = bytes / 1_000_000;
  return mb < 10 ? `${mb.toFixed(1)} MB` : `${Math.round(mb)} MB`;
}

/**
 * Plays a finished recording back before it is saved. Esc and clicks outside don't close it: a
 * recording can't be made again the same way, so only Save or Discard lets it go.
 */
export function RecordingDialog({
  recording,
  url,
  deviceNames,
  onRecordAgain,
  onClose,
}: RecordingDialogProps) {
  const src = useMemo(() => URL.createObjectURL(recording.blob), [recording.blob]);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const saveRef = useRef<HTMLButtonElement>(null);

  useEffect(() => () => URL.revokeObjectURL(src), [src]);
  useEffect(() => saveRef.current?.focus(), []);

  const [gifProgress, setGifProgress] = useState<number | null>(null);
  const [gifError, setGifError] = useState<string | null>(null);
  const gifAbort = useRef<AbortController | null>(null);
  useEffect(() => () => gifAbort.current?.abort(), []);

  function download(blob: Blob, extension: string) {
    // Its own URL, as the preview's goes when the dialog closes and the download may not be done.
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = shotFileName(url, deviceNames, extension, "recording");
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
  }

  function save() {
    download(recording.blob, recording.format.extension);
    onClose();
  }

  async function saveGif() {
    const abort = new AbortController();
    gifAbort.current = abort;
    setGifError(null);
    setGifProgress(0);
    try {
      const gif = await videoToGif(
        recording.blob,
        recording.durationMs,
        setGifProgress,
        abort.signal,
      );
      download(gif, "gif");
      onClose();
    } catch (reason) {
      if (!abort.signal.aborted) {
        setGifError(reason instanceof Error ? reason.message : "The GIF couldn't be made.");
      }
    } finally {
      if (gifAbort.current === abort) gifAbort.current = null;
      setGifProgress(null);
    }
  }

  const details = [
    formatElapsed(recording.durationMs),
    size ? `${size.width} × ${size.height}` : null,
    recording.format.extension.toUpperCase(),
    megabytes(recording.blob.size),
  ].filter(Boolean);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Recording"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-6 backdrop-blur-[2px]"
    >
      <div className="border-border/70 bg-background flex max-h-full w-[min(56rem,100%)] flex-col overflow-hidden rounded-xl border shadow-2xl">
        <div className="flex min-h-0 flex-1 items-center justify-center bg-black/90 p-4">
          <video
            src={src}
            controls
            autoPlay
            muted
            loop
            playsInline
            aria-label="Recording preview"
            onLoadedMetadata={(e) =>
              setSize({ width: e.currentTarget.videoWidth, height: e.currentTarget.videoHeight })
            }
            className="max-h-[min(36rem,calc(100vh-12rem))] max-w-full rounded-md"
          />
        </div>
        <div className="border-border/60 flex items-center gap-3 border-t px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm leading-tight font-semibold">Recording</h2>
            <p className="text-muted-foreground truncate text-[0.6875rem] tabular-nums">
              {gifError ?? `${details.join(" · ")} · ${deviceNames.join(", ")}`}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            <Trash2 />
            Discard
          </Button>
          <Button
            variant="twoTone"
            size="sm"
            onClick={onRecordAgain}
            disabled={gifProgress !== null}
          >
            <RotateCcw />
            Record again
          </Button>
          {gifProgress === null ? (
            <Button variant="twoTone" size="sm" onClick={() => void saveGif()}>
              <ImagePlay />
              Save GIF
            </Button>
          ) : (
            <Button variant="twoTone" size="sm" onClick={() => gifAbort.current?.abort()}>
              <span className="tabular-nums">{Math.round(gifProgress * 100)}%</span>
              Cancel GIF
            </Button>
          )}
          <Button ref={saveRef} size="sm" onClick={save} disabled={gifProgress !== null}>
            <Download />
            Save {recording.format.extension.toUpperCase()}
          </Button>
        </div>
      </div>
    </div>
  );
}
