const RULER = 16;

/**
 * Pixel rulers along the top and left of a screen and a square grid over it, drawn in the
 * device's own CSS pixels so they scale with the page.
 */
export function ScreenGuides({
  width,
  height,
  rulers,
  grid,
}: {
  width: number;
  height: number;
  rulers: boolean;
  /** Grid spacing in CSS pixels, or 0 for none. */
  grid: number;
}) {
  return (
    <div aria-hidden data-guides className="pointer-events-none absolute inset-0 z-20">
      {grid > 0 && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgb(139 92 246 / 0.22) 1px, transparent 1px), linear-gradient(to bottom, rgb(139 92 246 / 0.22) 1px, transparent 1px)",
            backgroundSize: `${grid}px ${grid}px`,
          }}
        />
      )}
      {rulers && (
        <>
          <Ruler length={width} horizontal />
          <Ruler length={height} horizontal={false} />
        </>
      )}
    </div>
  );
}

function Ruler({ length, horizontal }: { length: number; horizontal: boolean }) {
  const ticks: { at: number; size: number; label?: number }[] = [];
  for (let at = 10; at < length; at += 10) {
    const major = at % 100 === 0;
    ticks.push({ at, size: major ? RULER : at % 50 === 0 ? 8 : 4, label: major ? at : undefined });
  }
  return (
    <svg
      className="absolute top-0 left-0 bg-white/85 text-zinc-500 backdrop-blur-[1px] dark:bg-zinc-900/85 dark:text-zinc-400"
      width={horizontal ? length : RULER}
      height={horizontal ? RULER : length}
    >
      {ticks.map(({ at, size, label }) =>
        horizontal ? (
          <g key={at}>
            <line x1={at} x2={at} y1={RULER} y2={RULER - size} stroke="currentColor" />
            {label !== undefined && (
              <text x={at + 2} y={9} fontSize={8} fill="currentColor">
                {label}
              </text>
            )}
          </g>
        ) : (
          <g key={at}>
            <line y1={at} y2={at} x1={RULER} x2={RULER - size} stroke="currentColor" />
            {label !== undefined && (
              <text
                x={9}
                y={at + 2}
                fontSize={8}
                fill="currentColor"
                transform={`rotate(-90 9 ${at + 2})`}
                textAnchor="end"
              >
                {label}
              </text>
            )}
          </g>
        ),
      )}
      <line
        x1={horizontal ? 0 : RULER - 0.5}
        x2={horizontal ? length : RULER - 0.5}
        y1={horizontal ? RULER - 0.5 : 0}
        y2={horizontal ? RULER - 0.5 : length}
        stroke="currentColor"
        strokeOpacity={0.5}
      />
    </svg>
  );
}
