/** Rough finish colours, close enough to tell the frame colours apart at a glance. */
const SWATCHES: Record<string, string> = {
  "black titanium": "#3c3c3d",
  "white titanium": "#f2f1ed",
  "natural titanium": "#bab4a9",
  "desert titanium": "#bfa48f",
  "blue titanium": "#3f4a5a",
  "space black": "#2e2c2e",
  "space gray": "#7d7e80",
  "space grey": "#7d7e80",
  "star white": "#f4f2ec",
  "night sky": "#24283b",
  "cosmic orange": "#f77e2d",
  "deep blue": "#2f3d5c",
  "deep purple": "#594f63",
  "mist blue": "#a9bfd7",
  "sky blue": "#c4d9ec",
  "cloud white": "#f5f4f0",
  "light gold": "#e9dcc0",
  "rose gold": "#f1cfc4",
  "rose quartz": "#f1d3d0",
  "product (red)": "#ba0c2f",
  black: "#2b2b2d",
  white: "#f5f5f0",
  silver: "#e3e4e5",
  starlight: "#f0e5d3",
  midnight: "#2e3642",
  graphite: "#54524f",
  platinum: "#d9d9d6",
  stardust: "#e6e0d6",
  porcelain: "#ece8e1",
  obsidian: "#1f1f21",
  hazel: "#a7a08f",
  glacier: "#cfdde4",
  blue: "#5b8cc6",
  pink: "#f3c2c8",
  purple: "#b8a9d6",
  lavender: "#c9bde4",
  ultramarine: "#7a86e0",
  teal: "#8ec2bf",
  sage: "#b9c4a8",
  green: "#9cc5a1",
  yellow: "#f4d877",
  orange: "#f2a35e",
  red: "#d6343c",
  gold: "#e7d2a8",
  burgundy: "#6d2a35",
  indigo: "#3f4a8a",
  citrus: "#e6e38c",
  blush: "#f2c9c2",
  light: "#ececec",
  dark: "#2d2d2f",
};

const NEUTRAL = "#a1a1aa";

// Longest names first, so "Sky Blue" wins over "Blue" and "Space Black" over "Black".
const NAMES = Object.keys(SWATCHES).sort((a, b) => b.length - a.length);

export function swatchColor(colorName: string): string {
  const name = colorName.toLowerCase();
  const hit = NAMES.find((key) => new RegExp(`(^|[^a-z])${escape(key)}($|[^a-z])`).test(name));
  return hit ? SWATCHES[hit] : NEUTRAL;
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
