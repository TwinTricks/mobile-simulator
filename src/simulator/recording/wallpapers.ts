import { GRADIENTS, cssGradient } from "../screenshot/backgrounds";

export type Wallpaper = {
  id: string;
  label: string;
  /** A CSS background. */
  css: string;
  /** A plain colour close to it, for bars a video may need around it. */
  base: string;
};

export type WallpaperGroup = { title: string; wallpapers: Wallpaper[] };

type Blob = [x: number, y: number, color: string, reach?: number];

/** Soft patches of colour melting into each other over a base, like a mesh gradient. */
function mesh(base: string, blobs: Blob[]): string {
  const layers = blobs.map(
    ([x, y, color, reach = 55]) =>
      `radial-gradient(at ${x}% ${y}%, ${color} 0, transparent ${reach}%)`,
  );
  return [...layers, base].join(", ");
}

const wall = (id: string, label: string, base: string, css: string): Wallpaper => ({
  id,
  label,
  base,
  css,
});

export const WALLPAPER_GROUPS: readonly WallpaperGroup[] = [
  {
    title: "Basic",
    wallpapers: [
      wall("black", "Black", "#000000", "#000000"),
      wall("white", "White", "#ffffff", "#ffffff"),
    ],
  },
  {
    title: "macOS",
    wallpapers: [
      wall(
        "sonoma",
        "Sonoma",
        "#3f6212",
        mesh("linear-gradient(160deg, #6d8cff 0%, #3f6212 70%, #a3e635 100%)", [
          [15, 35, "#ff5f57", 45],
          [70, 10, "#8b9dff", 50],
          [40, 55, "#14532d", 45],
          [85, 90, "#d9f99d", 50],
        ]),
      ),
      wall(
        "ventura",
        "Ventura",
        "#ea580c",
        mesh("linear-gradient(135deg, #fb923c, #c2410c)", [
          [20, 20, "#fde68a", 45],
          [80, 30, "#f97316", 50],
          [50, 90, "#9a3412", 55],
        ]),
      ),
      wall(
        "monterey",
        "Monterey",
        "#7c3aed",
        mesh("linear-gradient(135deg, #312e81, #7c3aed)", [
          [15, 80, "#ec4899", 50],
          [85, 20, "#38bdf8", 45],
          [50, 50, "#a855f7", 40],
        ]),
      ),
      wall(
        "big-sur",
        "Big Sur",
        "#1d4ed8",
        mesh("linear-gradient(180deg, #1e3a8a, #0ea5e9 60%, #f472b6)", [
          [30, 70, "#f43f5e", 45],
          [75, 60, "#6366f1", 50],
          [50, 10, "#0f172a", 50],
        ]),
      ),
      wall(
        "sequoia",
        "Sequoia",
        "#0f766e",
        mesh("linear-gradient(150deg, #134e4a, #0d9488 55%, #fbbf24)", [
          [80, 15, "#22d3ee", 45],
          [20, 85, "#f59e0b", 45],
          [55, 45, "#115e59", 40],
        ]),
      ),
      wall(
        "tahoe",
        "Tahoe",
        "#0369a1",
        mesh("linear-gradient(170deg, #e0f2fe, #38bdf8 45%, #0c4a6e)", [
          [25, 30, "#ffffff", 40],
          [80, 70, "#0284c7", 50],
          [40, 95, "#082f49", 45],
        ]),
      ),
      wall(
        "catalina",
        "Catalina",
        "#334155",
        mesh("linear-gradient(180deg, #fcd34d, #f472b6 40%, #1e293b 75%)", [
          [70, 20, "#fb7185", 40],
          [25, 85, "#0f172a", 50],
        ]),
      ),
      wall(
        "mojave",
        "Mojave",
        "#92400e",
        mesh("linear-gradient(180deg, #fed7aa, #f59e0b 50%, #78350f)", [
          [30, 75, "#b45309", 50],
          [80, 60, "#451a03", 45],
        ]),
      ),
    ],
  },
  {
    title: "Glassmorphism",
    wallpapers: [
      wall(
        "glass-sky",
        "Sky",
        "#bfdbfe",
        mesh("linear-gradient(135deg, #eff6ff, #bfdbfe)", [
          [20, 30, "#93c5fd", 35],
          [80, 70, "#c4b5fd", 40],
        ]),
      ),
      wall(
        "glass-rose",
        "Rose",
        "#fbcfe8",
        mesh("linear-gradient(135deg, #fdf2f8, #fbcfe8)", [
          [25, 75, "#f9a8d4", 35],
          [75, 25, "#fde68a", 35],
        ]),
      ),
      wall(
        "glass-mint",
        "Mint",
        "#a7f3d0",
        mesh("linear-gradient(135deg, #ecfdf5, #a7f3d0)", [
          [20, 20, "#6ee7b7", 35],
          [80, 80, "#a5f3fc", 40],
        ]),
      ),
      wall(
        "glass-deep",
        "Deep",
        "#1e40af",
        mesh("linear-gradient(135deg, #1e3a8a, #312e81)", [
          [25, 30, "#3b82f6", 40],
          [75, 75, "#8b5cf6", 40],
        ]),
      ),
    ],
  },
  {
    title: "Iridescent",
    wallpapers: [
      wall(
        "iris-pearl",
        "Pearl",
        "#e9d5ff",
        mesh("linear-gradient(120deg, #f0fdfa, #e9d5ff)", [
          [15, 20, "#99f6e4", 40],
          [85, 30, "#fbcfe8", 40],
          [50, 90, "#c7d2fe", 45],
        ]),
      ),
      wall(
        "iris-lagoon",
        "Lagoon",
        "#5eead4",
        mesh("linear-gradient(120deg, #ccfbf1, #5eead4 50%, #a78bfa)", [
          [80, 20, "#f0abfc", 40],
          [20, 80, "#2dd4bf", 45],
        ]),
      ),
      wall(
        "iris-opal",
        "Opal",
        "#c7d2fe",
        mesh("linear-gradient(120deg, #e0e7ff, #fae8ff)", [
          [20, 70, "#a5f3fc", 40],
          [70, 20, "#c4b5fd", 40],
          [90, 90, "#fbcfe8", 40],
        ]),
      ),
      wall(
        "iris-flare",
        "Flare",
        "#f0abfc",
        mesh("linear-gradient(120deg, #a5f3fc, #f0abfc)", [
          [30, 30, "#ffffff", 30],
          [80, 80, "#e879f9", 45],
        ]),
      ),
    ],
  },
  {
    title: "Midnight",
    wallpapers: [
      wall(
        "night-silk",
        "Silk",
        "#09090b",
        mesh("linear-gradient(160deg, #18181b, #000000)", [
          [30, 40, "#3f3f46", 35],
          [80, 70, "#27272a", 40],
        ]),
      ),
      wall(
        "night-dune",
        "Dune",
        "#0c0a09",
        mesh("linear-gradient(200deg, #292524, #0c0a09)", [
          [20, 80, "#44403c", 40],
          [70, 30, "#1c1917", 40],
        ]),
      ),
      wall(
        "night-ink",
        "Ink",
        "#020617",
        mesh("linear-gradient(160deg, #0f172a, #020617)", [
          [75, 25, "#1e3a8a", 40],
          [25, 85, "#312e81", 40],
        ]),
      ),
      wall(
        "night-ember",
        "Ember",
        "#0a0a0a",
        mesh("linear-gradient(160deg, #171717, #0a0a0a)", [
          [80, 85, "#7f1d1d", 40],
          [20, 20, "#262626", 35],
        ]),
      ),
    ],
  },
  {
    title: "Radiant",
    wallpapers: [
      wall(
        "radiant-violet",
        "Violet",
        "#a855f7",
        mesh("linear-gradient(135deg, #c084fc, #f472b6)", [
          [20, 80, "#7c3aed", 45],
          [80, 20, "#fda4af", 40],
        ]),
      ),
      wall(
        "radiant-aqua",
        "Aqua",
        "#06b6d4",
        mesh("linear-gradient(135deg, #22d3ee, #6366f1)", [
          [80, 80, "#a78bfa", 45],
          [20, 20, "#67e8f9", 40],
        ]),
      ),
      wall(
        "radiant-electric",
        "Electric",
        "#4f46e5",
        mesh("linear-gradient(135deg, #4f46e5, #db2777)", [
          [20, 20, "#818cf8", 40],
          [80, 80, "#f472b6", 45],
        ]),
      ),
      wall(
        "radiant-bloom",
        "Bloom",
        "#ec4899",
        mesh("linear-gradient(135deg, #f9a8d4, #8b5cf6)", [
          [75, 25, "#fb7185", 40],
          [25, 75, "#6366f1", 45],
        ]),
      ),
    ],
  },
  {
    title: "Sunset",
    wallpapers: [
      wall(
        "sunset-dusk",
        "Dusk",
        "#ea580c",
        mesh("linear-gradient(160deg, #fdba74, #ea580c 60%, #7c2d12)", [[80, 20, "#fef3c7", 35]]),
      ),
      wall(
        "sunset-crimson",
        "Crimson",
        "#b91c1c",
        mesh("linear-gradient(160deg, #f87171, #991b1b)", [
          [20, 80, "#7f1d1d", 45],
          [80, 20, "#fca5a5", 35],
        ]),
      ),
      wall(
        "sunset-amber",
        "Amber",
        "#f59e0b",
        mesh("linear-gradient(160deg, #fde68a, #f97316)", [[70, 70, "#ea580c", 45]]),
      ),
      wall(
        "sunset-coral",
        "Coral",
        "#fb7185",
        mesh("linear-gradient(160deg, #fdba74, #fb7185 60%, #be123c)", [[25, 25, "#fed7aa", 35]]),
      ),
    ],
  },
  {
    title: "Spring",
    wallpapers: [
      wall(
        "spring-meadow",
        "Meadow",
        "#22c55e",
        mesh("linear-gradient(160deg, #bbf7d0, #22c55e 60%, #14532d)", [[80, 25, "#fef08a", 35]]),
      ),
      wall(
        "spring-blossom",
        "Blossom",
        "#f9a8d4",
        mesh("linear-gradient(160deg, #fce7f3, #f9a8d4)", [
          [20, 80, "#bbf7d0", 40],
          [80, 20, "#fbcfe8", 35],
        ]),
      ),
      wall(
        "spring-lagoon",
        "Lagoon",
        "#2dd4bf",
        mesh("linear-gradient(160deg, #99f6e4, #3b82f6)", [
          [75, 75, "#2563eb", 45],
          [25, 25, "#ccfbf1", 35],
        ]),
      ),
      wall(
        "spring-lime",
        "Lime",
        "#84cc16",
        mesh("linear-gradient(160deg, #ecfccb, #84cc16)", [
          [70, 75, "#4d7c0f", 45],
          [20, 20, "#fef9c3", 35],
        ]),
      ),
    ],
  },
  {
    title: "Gradients",
    wallpapers: GRADIENTS.map((g) => wall(g.id, g.label, g.stops[0]!, cssGradient(g))),
  },
];

const ALL = WALLPAPER_GROUPS.flatMap((group) => group.wallpapers);
export const WALLPAPER_COUNT = ALL.length;

export function findWallpaper(id: string): Wallpaper | null {
  return ALL.find((w) => w.id === id) ?? null;
}
