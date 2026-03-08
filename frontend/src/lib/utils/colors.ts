export interface ColorPalette {
  name: string;
  bg: string;
  gradient: string;
  text: string;
  swatches: string[];
}

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
