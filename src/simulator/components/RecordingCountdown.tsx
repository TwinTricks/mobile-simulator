/** The seconds left before recording starts, big over the devices. */
export function RecordingCountdown({ left }: { left: number }) {
  return (
    <div
      role="status"
      aria-label={`Recording starts in ${left}`}
      className="pointer-events-none fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-black/25"
    >
      <span
        key={left}
        className="animate-in zoom-in-50 fade-in flex size-36 items-center justify-center rounded-full bg-black/70 text-7xl font-semibold text-white tabular-nums shadow-2xl duration-300"
      >
        {left}
      </span>
      <span className="rounded-full bg-black/60 px-3 py-1 text-xs text-white">
        Press V or Esc to call it off
      </span>
    </div>
  );
}
