// ─── Shared layout config (ColorWorkFlow + ColorWorkResumeFlow) ─────────────

export type GridLayoutType =
  | "G2"
  | "G2_GRID"
  | "G6"
  | "G6_GRID"
  | "G3"
  | "G3_GRID";

export const LAYOUT_CONFIG = {
  // ── 4장 매거진 ──────────────────────────────────────────────────────────
  G2: {
    areas: ["s0", "s1", "s2", "s3"] as const,
    containerStyle: {
      gridTemplateAreas: '"s0 s0 s1" "s2 s3 s3"',
      gridTemplateColumns: "1fr 1fr 1fr",
      gridTemplateRows: "1fr 1fr",
      aspectRatio: "3/2",
    },
    previewAreas: '"a a b" "c d d"',
    previewCells: ["a", "b", "c", "d"] as const,
    previewSize: { width: 66, height: 44 },
    previewImage: "/images/layout-previews/g2.jpg",
    backendType: "G2" as const,
    slotCount: 4,
    label: "와이드 콜라주",
  },
  // ── 4장 격자 ─────────────────────────────────────────────────────────────
  G2_GRID: {
    areas: ["s0", "s1", "s2", "s3"] as const,
    containerStyle: {
      gridTemplateAreas: '"s0 s1" "s2 s3"',
      gridTemplateColumns: "1fr 1fr",
      gridTemplateRows: "1fr 1fr",
      aspectRatio: "1/1",
    },
    previewAreas: '"a b" "c d"',
    previewCells: ["a", "b", "c", "d"] as const,
    previewSize: { width: 44, height: 44 },
    previewImage: "/images/layout-previews/g2_grid.jpg",
    backendType: "G2" as const,
    slotCount: 4,
    label: "격자",
  },
  // ── 6장 에디토리얼 ────────────────────────────────────────────────────────
  G6: {
    areas: ["s0", "s1", "s2", "s3", "s4", "s5"] as const,
    containerStyle: {
      gridTemplateAreas: '"s0 s1 s2" "s3 s3 s4" "s3 s3 s5"',
      gridTemplateColumns: "1fr 1fr 1fr",
      gridTemplateRows: "1fr 1fr 1fr",
      aspectRatio: "1/1",
    },
    previewAreas: '"a b c" "d d e" "d d f"',
    previewCells: ["a", "b", "c", "d", "e", "f"] as const,
    previewSize: { width: 60, height: 60 },
    previewImage: "/images/layout-previews/g6.jpg",
    backendType: "G6" as const,
    slotCount: 6,
    label: "에디토리얼",
  },
  // ── 6장 격자 ─────────────────────────────────────────────────────────────
  G6_GRID: {
    areas: ["s0", "s1", "s2", "s3", "s4", "s5"] as const,
    containerStyle: {
      gridTemplateAreas: '"s0 s1" "s2 s3" "s4 s5"',
      gridTemplateColumns: "1fr 1fr",
      gridTemplateRows: "1fr 1fr 1fr",
      aspectRatio: "2/3",
    },
    previewAreas: '"a b" "c d" "e f"',
    previewCells: ["a", "b", "c", "d", "e", "f"] as const,
    previewSize: { width: 40, height: 60 },
    previewImage: "/images/layout-previews/g6_grid.jpg",
    backendType: "G6" as const,
    slotCount: 6,
    label: "격자",
  },
  // ── 9장 스텝 콜라주 ───────────────────────────────────────────────────────
  G3: {
    areas: ["s0", "s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"] as const,
    containerStyle: {
      gridTemplateAreas: '"s0 s0 s1 s2" "s3 s4 s4 s5" "s6 s7 s8 s8"',
      gridTemplateColumns: "1fr 1fr 1fr 1fr",
      gridTemplateRows: "1fr 1fr 1fr",
      aspectRatio: "4/3",
    },
    previewAreas: '"a a b c" "d e e f" "g h i i"',
    previewCells: ["a", "b", "c", "d", "e", "f", "g", "h", "i"] as const,
    previewSize: { width: 68, height: 51 },
    previewImage: "/images/layout-previews/g3.jpg",
    backendType: "G3" as const,
    slotCount: 9,
    label: "스텝 콜라주",
  },
  // ── 9장 격자 ─────────────────────────────────────────────────────────────
  G3_GRID: {
    areas: ["s0", "s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"] as const,
    containerStyle: {
      gridTemplateAreas: '"s0 s1 s2" "s3 s4 s5" "s6 s7 s8"',
      gridTemplateColumns: "1fr 1fr 1fr",
      gridTemplateRows: "1fr 1fr 1fr",
      aspectRatio: "1/1",
    },
    previewAreas: '"a b c" "d e f" "g h i"',
    previewCells: ["a", "b", "c", "d", "e", "f", "g", "h", "i"] as const,
    previewSize: { width: 51, height: 51 },
    previewImage: "/images/layout-previews/g3_grid.jpg",
    backendType: "G3" as const,
    slotCount: 9,
    label: "격자",
  },
} as const;

export const THICKNESS_CONFIG = {
  none:   { pad: 0,  gap: 0, rounded: "rounded-none" },
  thin:   { pad: 8,  gap: 3, rounded: "rounded-lg"   },
  medium: { pad: 20, gap: 8, rounded: "rounded-xl"   },
} as const;
