export interface ColorPalette {
  name: string;
  bg: string;
  gradient: string;
  text: string;
  swatches: string[];
}

// ── Hex-based palettes for API use ───────────────────────────────────────────

export interface HexPalette {
  name: string;
  colors: { hex: string; name: string }[];
}

const HEX_PALETTES: HexPalette[] = [
  { name: "Sunset",   colors: [{ hex: "#FBBF24", name: "Amber" }, { hex: "#F97316", name: "Orange" }, { hex: "#EF4444", name: "Red" }, { hex: "#DC2626", name: "Crimson" }, { hex: "#7C3AED", name: "Violet" }] },
  { name: "Ocean",    colors: [{ hex: "#BAE6FD", name: "Sky" }, { hex: "#38BDF8", name: "Cyan" }, { hex: "#0EA5E9", name: "Blue" }, { hex: "#2563EB", name: "Cobalt" }, { hex: "#1E3A8A", name: "Navy" }] },
  { name: "Forest",   colors: [{ hex: "#D1FAE5", name: "Mint" }, { hex: "#6EE7B7", name: "Emerald" }, { hex: "#10B981", name: "Green" }, { hex: "#047857", name: "Forest" }, { hex: "#064E3B", name: "Moss" }] },
  { name: "Berry",    colors: [{ hex: "#FDE8E8", name: "Blush" }, { hex: "#FBBCBC", name: "Rose" }, { hex: "#F87171", name: "Coral" }, { hex: "#E11D48", name: "Berry" }, { hex: "#9D174D", name: "Wine" }] },
  { name: "Lavender", colors: [{ hex: "#EDE9FE", name: "Lavender" }, { hex: "#C4B5FD", name: "Wisteria" }, { hex: "#8B5CF6", name: "Purple" }, { hex: "#6D28D9", name: "Violet" }, { hex: "#3B0764", name: "Plum" }] },
  { name: "Lemon",    colors: [{ hex: "#FEF9C3", name: "Cream" }, { hex: "#FDE047", name: "Yellow" }, { hex: "#EAB308", name: "Gold" }, { hex: "#B45309", name: "Amber" }, { hex: "#78350F", name: "Brown" }] },
  { name: "Mint",     colors: [{ hex: "#CCFBF1", name: "Frost" }, { hex: "#5EEAD4", name: "Teal" }, { hex: "#14B8A6", name: "Mint" }, { hex: "#0F766E", name: "Spruce" }, { hex: "#134E4A", name: "Pine" }] },
  { name: "Cocoa",    colors: [{ hex: "#FDF4DC", name: "Cream" }, { hex: "#F59E0B", name: "Honey" }, { hex: "#B45309", name: "Caramel" }, { hex: "#78350F", name: "Cocoa" }, { hex: "#3B1A08", name: "Espresso" }] },
  { name: "Ash",      colors: [{ hex: "#F1F5F9", name: "Fog" }, { hex: "#CBD5E1", name: "Silver" }, { hex: "#64748B", name: "Slate" }, { hex: "#334155", name: "Ash" }, { hex: "#0F172A", name: "Ink" }] },
  { name: "Sakura",   colors: [{ hex: "#FFF0F6", name: "Petal" }, { hex: "#FFADD2", name: "Blush" }, { hex: "#FF85C0", name: "Pink" }, { hex: "#EB2F96", name: "Fuchsia" }, { hex: "#9E1068", name: "Magenta" }] },
  { name: "Dusk",     colors: [{ hex: "#FFF7ED", name: "Peach" }, { hex: "#FED7AA", name: "Apricot" }, { hex: "#FB923C", name: "Tangerine" }, { hex: "#C2410C", name: "Rust" }, { hex: "#431407", name: "Mahogany" }] },
  { name: "Arctic",   colors: [{ hex: "#E0F2FE", name: "Ice" }, { hex: "#7DD3FC", name: "Glacier" }, { hex: "#38BDF8", name: "Arctic" }, { hex: "#0369A1", name: "Deep" }, { hex: "#0C4A6E", name: "Abyss" }] },
];

export const hexToColorName = (hex: string): string => {
  for (const palette of HEX_PALETTES) {
    const entry = palette.colors.find((c) => c.hex.toLowerCase() === hex.toLowerCase());
    if (entry) return entry.name;
  }
  return hex;
};

export const randomHexPalettes = (): HexPalette[] =>
  [...HEX_PALETTES].sort(() => 0.5 - Math.random()).slice(0, 3);

export const randomColorPalette = (): ColorPalette[] => {
  const palettes: ColorPalette[] = [
    {
      name: "Sunset",
      bg: "bg-orange-500",
      gradient: "from-orange-300 via-orange-500 to-red-800",
      text: "text-orange-900",
      swatches: ["bg-orange-200", "bg-orange-400", "bg-red-500"],
    },
    {
      name: "Ocean",
      bg: "bg-blue-500",
      gradient: "from-blue-200 via-blue-500 to-indigo-900",
      text: "text-blue-900",
      swatches: ["bg-cyan-200", "bg-blue-400", "bg-indigo-600"],
    },
    {
      name: "Forest",
      bg: "bg-emerald-500",
      gradient: "from-emerald-200 via-emerald-500 to-green-900",
      text: "text-emerald-900",
      swatches: ["bg-green-200", "bg-emerald-400", "bg-teal-700"],
    },
    {
      name: "Berry",
      bg: "bg-rose-500",
      gradient: "from-rose-200 via-rose-500 to-rose-900",
      text: "text-rose-900",
      swatches: ["bg-pink-200", "bg-rose-400", "bg-rose-700"],
    },
    {
      name: "Lavender",
      bg: "bg-purple-500",
      gradient: "from-purple-200 via-purple-500 to-indigo-800",
      text: "text-purple-900",
      swatches: ["bg-purple-200", "bg-purple-400", "bg-purple-700"],
    },
    {
      name: "Lemon",
      bg: "bg-yellow-400",
      gradient: "from-yellow-100 via-yellow-400 to-amber-600",
      text: "text-yellow-900",
      swatches: ["bg-yellow-100", "bg-yellow-300", "bg-amber-500"],
    },
    {
      name: "Mint",
      bg: "bg-teal-400",
      gradient: "from-teal-100 via-teal-400 to-teal-800",
      text: "text-teal-900",
      swatches: ["bg-teal-100", "bg-teal-300", "bg-teal-600"],
    },
    {
      name: "Cocoa",
      bg: "bg-amber-700",
      gradient: "from-amber-300 via-amber-600 to-amber-900",
      text: "text-amber-900",
      swatches: ["bg-amber-200", "bg-amber-500", "bg-amber-800"],
    },
    {
      name: "Ash",
      bg: "bg-slate-500",
      gradient: "from-slate-300 via-slate-500 to-slate-800",
      text: "text-slate-900",
      swatches: ["bg-slate-300", "bg-slate-500", "bg-slate-700"],
    },
  ];
  return [...palettes].sort(() => 0.5 - Math.random()).slice(0, 3);
};
