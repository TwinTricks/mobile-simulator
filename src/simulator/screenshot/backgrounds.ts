export type GradientBackground = {
  id: string;
  label: string;
  /** Degrees, CSS style: 0 runs bottom to top, 90 left to right. */
  angle: number;
  stops: readonly string[];
  /** Whether a caption on it should be light. */
  dark: boolean;
};

export const GRADIENTS: readonly GradientBackground[] = [
  { id: "violet", label: "Violet", angle: 135, stops: ["#7c3aed", "#ec4899"], dark: true },
  { id: "ocean", label: "Ocean", angle: 135, stops: ["#0ea5e9", "#6366f1"], dark: true },
  { id: "sunset", label: "Sunset", angle: 135, stops: ["#f97316", "#e11d48"], dark: true },
  { id: "mint", label: "Mint", angle: 135, stops: ["#34d399", "#06b6d4"], dark: false },
  { id: "peach", label: "Peach", angle: 135, stops: ["#fde68a", "#fca5a5"], dark: false },
  { id: "lilac", label: "Lilac", angle: 135, stops: ["#e9d5ff", "#c7d2fe"], dark: false },
  { id: "night", label: "Night", angle: 160, stops: ["#0f172a", "#312e81"], dark: true },
  { id: "graphite", label: "Graphite", angle: 160, stops: ["#3f3f46", "#18181b"], dark: true },
  { id: "paper", label: "Paper", angle: 180, stops: ["#fafafa", "#e4e4e7"], dark: false },
];

export function findGradient(id: string): GradientBackground | null {
  return GRADIENTS.find((g) => g.id === id) ?? null;
}

export function cssGradient(gradient: GradientBackground): string {
  return `linear-gradient(${gradient.angle}deg, ${gradient.stops.join(", ")})`;
}

/** Whether a colour like `#rrggbb` is dark enough to want light text on it. */
export function isDarkHex(hex: string): boolean {
  const value = /^#?([0-9a-f]{6})$/i.exec(hex)?.[1];
  if (!value) return false;
  const n = parseInt(value, 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b < 150;
}
