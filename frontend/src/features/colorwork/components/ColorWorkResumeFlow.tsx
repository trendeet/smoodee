"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Camera,
  RefreshCcw,
  Download,
  Share2,
  Menu,
} from "lucide-react";
import StatusBar from "@/components/ui/StatusBar";
import Button from "@/components/ui/Button";
import ColorBlockSelector from "./ColorBlockSelector";
import { colorworkService } from "@/lib/api/colorworkService";
import { assetService } from "@/lib/api/assetService";
import { useUI } from "@/lib/context/UIContext";
import { ColorPalette as ApiColorPalette } from "@/lib/api/types";
import { GridLayoutType, LAYOUT_CONFIG, THICKNESS_CONFIG } from "../layoutConfig";

// ─── Local types ───────────────────────────────────────────────────────────

interface UploadSlot {
  assetId?: number;
  url?: string;
  file?: File;
}

interface Props {
  projectId: number;
  initialStep?: 1 | 2 | 3 | 4;
}

// ─── Component ─────────────────────────────────────────────────────────────

const ColorWorkResumeFlow = ({ projectId, initialStep }: Props) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { openMenu } = useUI();

  // ── step: null = loading ──
  const [step, setStep] = useState<1 | 2 | 3 | 4 | null>(null);

  // ── palette ──
  const [apiPalettes, setApiPalettes] = useState<ApiColorPalette[]>([]);
  const [selectedApiPalette, setSelectedApiPalette] =
    useState<ApiColorPalette | null>(null);
  const [isPalettesLoading, setIsPalettesLoading] = useState(false);

  // ── grid ──
  const [gridType, setGridType] = useState<GridLayoutType | null>(null);

  // ── slots ──
  const [slots, setSlots] = useState<(UploadSlot | null)[]>([]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  // ── frame style ──
  const [frameColor, setFrameColor] = useState<"white" | "black" | "palette">("white");
  const [frameThickness, setFrameThickness] = useState<"none" | "thin" | "medium">("thin");

  // ── result ──
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // ── frame modal ──
  const [frameModalStep, setFrameModalStep] = useState<
    "closed" | "confirm" | "select"
  >("closed");

  // ── file upload ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingSlotIndex = useRef<number>(-1);

  // ── 프레임 스타일 (공통) ──────────────────────────────────────────────────
  const tc = THICKNESS_CONFIG[frameThickness];
  const frameColorHex =
    frameColor === "black"
      ? "#000000"
      : frameColor === "palette"
      ? (selectedApiPalette?.colors[Math.floor((selectedApiPalette?.colors.length ?? 0) / 2)]?.hex ?? "#e0e0e0")
      : "#FFFFFF";

  // ── Fetch palettes ────────────────────────────────────────────────────────

  const fetchPalettes = useCallback(async () => {
    setIsPalettesLoading(true);
    try {
      const res = await colorworkService.shufflePalette(0);
      setApiPalettes(res?.palettes ?? []);
    } finally {
      setIsPalettesLoading(false);
    }
  }, []);

  // ── On mount: restore state ───────────────────────────────────────────────

  useEffect(() => {
    colorworkService
      .getState(projectId)
      .then((state) => {
        // Restore palette
        if (state.selectedPaletteSeed && state.selectedColors) {
          setSelectedApiPalette({
            seed: state.selectedPaletteSeed,
            colors: state.selectedColors,
          });
        }

        // Restore grid and slots — backend only knows G2/G6/G3, map to base types
        if (state.gridType) {
          const gt = state.gridType as GridLayoutType;
          setGridType(gt);
          const slotCount = LAYOUT_CONFIG[gt].slotCount;
          const restored: (UploadSlot | null)[] = Array(slotCount).fill(null);
          state.frames.forEach((f) => {
            if (f && f.index < slotCount) {
              restored[f.index] = { assetId: f.assetId, url: f.assetUrl };
            }
          });
          setSlots(restored);
        }

        // Determine step
        if (initialStep && state.gridType) {
          setStep(initialStep);
        } else if (state.gridType) {
          setStep(3);
        } else if (state.selectedPaletteSeed) {
          fetchPalettes();
          setStep(2);
        } else {
          fetchPalettes();
          setStep(1);
        }
      })
      .catch(() => {
        router.replace("/inprogress");
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigation ────────────────────────────────────────────────────────────

  const goBack = () => router.replace("/inprogress");

  // ── Palette ──────────────────────────────────────────────────────────────

  const handleRefreshPalettes = async () => {
    await fetchPalettes();
    setSelectedApiPalette(null);
  };

  const handleSelectPalette = async (palette: ApiColorPalette) => {
    setSelectedApiPalette(palette);
    await colorworkService.selectPalette(projectId, {
      seed: palette.seed,
      colors: palette.colors,
    });
  };

  // ── Grid ─────────────────────────────────────────────────────────────────

  const handleGridSelect = async (type: GridLayoutType) => {
    setGridType(type);
    setSlots(Array(LAYOUT_CONFIG[type].slotCount).fill(null));
    await colorworkService.selectGrid(projectId, LAYOUT_CONFIG[type].backendType);
  };

  // ── Upload ───────────────────────────────────────────────────────────────

  const handleSlotClick = (index: number) => {
    pendingSlotIndex.current = index;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const idx = pendingSlotIndex.current;
    if (!file || idx < 0) return;
    e.target.value = "";
    pendingSlotIndex.current = -1;

    const localUrl = URL.createObjectURL(file);
    setSlots((prev) => {
      const next = [...prev];
      next[idx] = { url: localUrl, file };
      return next;
    });

    setUploadingIndex(idx);
    try {
      const asset = await assetService.uploadAsset(projectId, file);
      await colorworkService.bindFrame(projectId, idx, asset.id);
      setSlots((prev) => {
        const next = [...prev];
        next[idx] = { assetId: asset.id, url: asset.url };
        return next;
      });
    } catch {
      // keep local preview
    } finally {
      setUploadingIndex(null);
    }
  };

  // ── Complete ─────────────────────────────────────────────────────────────

  const handleComplete = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      try {
        await colorworkService.complete(projectId);
      } catch (e) {
        console.error("complete 저장 실패:", e);
      }
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setStep(4);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────

  if (step === null) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400 text-sm">
        불러오는 중...
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // STEP 1: Palette selection
  // ════════════════════════════════════════════════════════════════════════

  if (step === 1) {
    return (
      <div className="flex flex-col h-full bg-white animate-fade-in relative pb-safe">
        <StatusBar theme="dark" />
        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-3">
            <button
              onClick={openMenu}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Menu size={24} />
            </button>
            <span
              className="text-xl font-black tracking-tight cursor-pointer"
              onClick={() => router.replace("/")}
            >Smoodee</span>
          </div>
        </div>
        <div className="px-6 pt-6 pb-2">
          <button
            onClick={goBack}
            className="mb-6 p-2 -ml-2 rounded-full hover:bg-gray-100 w-fit transition-colors"
          >
            <ChevronLeft />
          </button>
          <h1 className="text-3xl font-black leading-tight text-gray-900 mb-2 tracking-tight">
            오늘 당신의
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
              무드
            </span>
            는 어떤가요?
          </h1>
          <p className="text-gray-500 text-sm font-medium">
            가장 끌리는 팔레트를 선택해주세요.
          </p>
        </div>

        <div className="flex-1 px-6 flex flex-col justify-center py-6">
          <div className="relative">
            <button
              onClick={handleRefreshPalettes}
              disabled={isPalettesLoading}
              className="absolute -top-7 right-0 flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-gray-600 transition-colors active:scale-95 disabled:opacity-50"
            >
              <RefreshCcw size={11} /> 새로고침
            </button>
            <div className="grid grid-cols-3 gap-4">
              {apiPalettes.map((palette, i) => {
                const repColor =
                  palette.colors[Math.floor(palette.colors.length / 2)];
                return (
                  <ColorBlockSelector
                    key={i}
                    color={{ name: palette.seed, hex: repColor?.hex }}
                    isSelected={selectedApiPalette?.seed === palette.seed}
                    onClick={() => handleSelectPalette(palette)}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-6 safe-area-bottom bg-gradient-to-t from-white via-white/80 to-transparent pt-4">
          <Button
            size="lg"
            disabled={!selectedApiPalette}
            onClick={() => setStep(2)}
          >
            {selectedApiPalette ? "선택 완료" : "색상을 선택해주세요"}
          </Button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // STEP 2: Grid selection
  // ════════════════════════════════════════════════════════════════════════

  if (step === 2) {
    return (
      <div className="flex flex-col h-full bg-white animate-slide-left relative">
        <StatusBar theme="dark" />
        <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100">
          <button
            onClick={openMenu}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Menu size={24} />
          </button>
          <span className="text-xl font-black tracking-tight">Smoodee</span>
        </div>
        <div className="px-6 pt-6 pb-6">
          <button
            onClick={goBack}
            className="mb-6 p-2 -ml-2 rounded-full hover:bg-gray-100 w-fit"
          >
            <ChevronLeft />
          </button>
          <h1 className="text-3xl font-black mb-2">
            몇 장의 사진을
            <br />
            담을까요?
          </h1>
          <p className="text-gray-500">원하는 레이아웃을 선택해주세요.</p>
        </div>
        <div className="flex-1 px-6 flex flex-col justify-center gap-5 overflow-y-auto no-scrollbar">
          {(
            [
              { countLabel: "4장", variants: ["G2", "G2_GRID"] as const },
              { countLabel: "6장", variants: ["G6", "G6_GRID"] as const },
              { countLabel: "9장", variants: ["G3", "G3_GRID"] as const },
            ] as const
          ).map(({ countLabel, variants }) => (
            <div key={countLabel}>
              <p className="text-sm font-bold text-gray-500 mb-2">{countLabel}</p>
              <div className="flex gap-3">
                {variants.map((type) => {
                  const cfg = LAYOUT_CONFIG[type];
                  const isSelected = gridType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => handleGridSelect(type)}
                      className={`flex-1 border-2 rounded-2xl p-4 flex flex-col items-center gap-3 transition-all ${
                        isSelected
                          ? "border-black bg-gray-50 shadow-lg"
                          : "border-gray-100 hover:border-gray-300"
                      }`}
                    >
                      <div
                        className="grid gap-[3px]"
                        style={{
                          gridTemplateAreas: cfg.previewAreas,
                          gridTemplateColumns: cfg.containerStyle.gridTemplateColumns,
                          gridTemplateRows: cfg.containerStyle.gridTemplateRows,
                          width: cfg.previewSize.width,
                          height: cfg.previewSize.height,
                        }}
                      >
                        {cfg.previewCells.map((area) => (
                          <div
                            key={area}
                            className={`rounded-[2px] ${isSelected ? "bg-gray-400" : "bg-gray-200"}`}
                            style={{ gridArea: area }}
                          />
                        ))}
                      </div>
                      <span className={`text-xs font-bold ${isSelected ? "text-gray-900" : "text-gray-400"}`}>
                        {cfg.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="p-6 pb-safe safe-area-bottom bg-white">
          <Button size="lg" disabled={!gridType} onClick={() => setStep(3)}>
            시작하기
          </Button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // STEP 3: Upload photos
  // ════════════════════════════════════════════════════════════════════════

  if (step === 3) {
    const filledCount = slots.filter(Boolean).length;
    const totalSlots = slots.length;
    const isComplete = filledCount === totalSlots && totalSlots > 0;

    return (
      <div className="flex flex-col h-full bg-white animate-slide-left relative">
        <StatusBar theme="dark" />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="px-4 py-3 flex justify-between items-center border-b border-gray-100">
          <div className="flex items-center gap-1">
            <button
              onClick={goBack}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100"
            >
              <ChevronLeft />
            </button>
            <button
              onClick={openMenu}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Menu size={22} />
            </button>
          </div>
          <span className="font-bold">
            {filledCount} / {totalSlots} 채움
          </span>
          <div className="w-20" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50 overflow-y-auto">
          {selectedApiPalette &&
            (() => {
              const rep =
                selectedApiPalette.colors[
                  Math.floor(selectedApiPalette.colors.length / 2)
                ];
              return (
                <div className="flex items-center gap-3 mb-4 bg-white rounded-2xl px-4 py-2.5 shadow-sm border border-gray-100">
                  <div
                    className="w-8 h-8 rounded-lg shrink-0"
                    style={{ backgroundColor: rep?.hex }}
                  />
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      선택한 색상
                    </p>
                    <p className="text-sm font-black text-gray-900">
                      {selectedApiPalette.seed}
                    </p>
                  </div>
                </div>
              );
            })()}

          {/* 외부 컨테이너: aspect-ratio로 높이 고정, 배경색 = 선택한 테두리 색 */}
          <div
            className={`w-4/5 relative shadow-2xl overflow-hidden ${tc.rounded}`}
            style={{
              aspectRatio: gridType ? LAYOUT_CONFIG[gridType].containerStyle.aspectRatio : undefined,
              backgroundColor: frameColorHex,
            }}
          >
            {/* 내부 그리드 */}
            <div
              className="absolute inset-0 grid"
              style={gridType ? {
                gridTemplateAreas: LAYOUT_CONFIG[gridType].containerStyle.gridTemplateAreas,
                gridTemplateColumns: LAYOUT_CONFIG[gridType].containerStyle.gridTemplateColumns,
                gridTemplateRows: LAYOUT_CONFIG[gridType].containerStyle.gridTemplateRows,
                gap: `${tc.gap}px`,
                padding: `${tc.pad}px`,
              } : undefined}
            >
              {slots.map((slot, i) => (
                <div
                  key={i}
                  onClick={() => uploadingIndex === null && handleSlotClick(i)}
                  className={`relative overflow-hidden cursor-pointer transition-all active:scale-95 ${
                    slot ? "bg-gray-800" : "bg-gray-100 hover:bg-gray-200"
                  } flex items-center justify-center min-h-0 min-w-0`}
                  style={gridType ? { gridArea: LAYOUT_CONFIG[gridType].areas[i] } : undefined}
                >
                  {uploadingIndex === i ? (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : slot?.url ? (
                    <img
                      src={slot.url}
                      alt="slot"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="text-gray-400" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <p className="text-sm text-gray-500">
              각 프레임을 눌러 사진을 채워주세요!
            </p>
            <button
              onClick={() => setFrameModalStep("confirm")}
              className="text-xs font-bold text-gray-400 underline underline-offset-2 hover:text-gray-600 transition-colors shrink-0"
            >
              프레임 바꾸기
            </button>
          </div>

          {/* 테두리 색상 + 두께 선택 */}
          <div className="mt-4 flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              {(
                [
                  { key: "white" as const, bg: "#FFFFFF", border: true },
                  { key: "black" as const, bg: "#000000" },
                  { key: "palette" as const, bg: selectedApiPalette?.colors[Math.floor((selectedApiPalette?.colors.length ?? 0) / 2)]?.hex ?? "#e0e0e0", border: true },
                ] as { key: "white" | "black" | "palette"; bg: string; border?: boolean }[]
              ).map(({ key, bg, border }) => (
                <button
                  key={key}
                  onClick={() => setFrameColor(key)}
                  className={`w-7 h-7 rounded-full transition-all ${
                    frameColor === key
                      ? "ring-2 ring-offset-2 ring-gray-800 scale-110"
                      : "opacity-60 hover:opacity-100"
                  } ${border ? "border border-gray-300" : ""}`}
                  style={{ backgroundColor: bg }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {[
                { key: "none" as const, p: 0, g: 0 },
                { key: "thin" as const, p: 2, g: 1 },
                { key: "medium" as const, p: 4, g: 2 },
              ].map(({ key, p, g }) => (
                <button
                  key={key}
                  onClick={() => setFrameThickness(key)}
                  className={`p-1.5 rounded-xl border-2 transition-all ${
                    frameThickness === key
                      ? "border-gray-800 bg-gray-100 shadow-sm"
                      : "border-gray-300 bg-white hover:border-gray-500"
                  }`}
                >
                  {key === "none" ? (
                    <div className="w-8 h-8 bg-gray-200 flex items-center justify-center rounded-sm relative">
                      <div className="w-5 h-0.5 bg-gray-500 rounded-full rotate-45 absolute" />
                      <div className="w-5 h-0.5 bg-gray-500 rounded-full -rotate-45 absolute" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-gray-200 flex items-center justify-center rounded-sm overflow-hidden" style={{ padding: p }}>
                      <div className="w-full h-full grid grid-cols-2 grid-rows-2" style={{ gap: g }}>
                        {[0, 1, 2, 3].map((i) => (
                          <div key={i} className="bg-gray-500 rounded-[1px]" />
                        ))}
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 pb-safe safe-area-bottom bg-white border-t border-gray-100">
          <Button
            size="lg"
            disabled={!isComplete || isSubmitting}
            onClick={handleComplete}
          >
            {isSubmitting ? "처리 중..." : "완성하기"}
          </Button>
        </div>

        {frameModalStep !== "closed" && (
          <div
            className="absolute inset-0 z-50 flex items-end bg-black/40"
            onClick={() => setFrameModalStep("closed")}
          >
            <div
              className="bg-white w-full rounded-t-3xl p-6 pb-safe"
              onClick={(e) => e.stopPropagation()}
            >
              {frameModalStep === "confirm" ? (
                <>
                  <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-14 h-14 bg-orange-50 rounded-full flex items-center justify-center mb-4">
                      <span className="text-2xl">⚠️</span>
                    </div>
                    <h2 className="text-xl font-black text-gray-900">
                      프레임을 바꾸시겠어요?
                    </h2>
                    <p className="text-sm text-gray-500 font-medium mt-2">
                      기존에 저장된 이미지가 모두 삭제됩니다.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setFrameModalStep("closed")}
                      className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-2xl text-sm font-bold hover:bg-gray-200 transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={() => setFrameModalStep("select")}
                      className="flex-1 py-3 bg-black text-white rounded-2xl text-sm font-bold hover:bg-gray-800 transition-colors"
                    >
                      프레임 바꾸기
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-black mb-4">프레임 수 변경</h2>
                  <div className="flex flex-col gap-4">
                    {(
                      [
                        { countLabel: "4장", variants: ["G2", "G2_GRID"] as const },
                        { countLabel: "6장", variants: ["G6", "G6_GRID"] as const },
                        { countLabel: "9장", variants: ["G3", "G3_GRID"] as const },
                      ] as const
                    ).map(({ countLabel, variants }) => (
                      <div key={countLabel}>
                        <p className="text-xs font-bold text-gray-400 mb-2">{countLabel}</p>
                        <div className="flex gap-2">
                          {variants.map((type) => {
                            const cfg = LAYOUT_CONFIG[type];
                            const isSelected = gridType === type;
                            return (
                              <button
                                key={type}
                                onClick={async () => {
                                  await handleGridSelect(type);
                                  setFrameModalStep("closed");
                                }}
                                className={`flex-1 border-2 rounded-2xl p-3 flex flex-col items-center gap-2 transition-all ${
                                  isSelected
                                    ? "border-black bg-gray-50"
                                    : "border-gray-100 hover:border-gray-300"
                                }`}
                              >
                                <div
                                  className="grid gap-[3px]"
                                  style={{
                                    gridTemplateAreas: cfg.previewAreas,
                                    gridTemplateColumns: cfg.containerStyle.gridTemplateColumns,
                                    gridTemplateRows: cfg.containerStyle.gridTemplateRows,
                                    width: cfg.previewSize.width,
                                    height: cfg.previewSize.height,
                                  }}
                                >
                                  {cfg.previewCells.map((area) => (
                                    <div
                                      key={area}
                                      className={`rounded-[2px] ${isSelected ? "bg-gray-400" : "bg-gray-200"}`}
                                      style={{ gridArea: area }}
                                    />
                                  ))}
                                </div>
                                <span className={`text-xs font-bold ${isSelected ? "text-gray-900" : "text-gray-400"}`}>
                                  {cfg.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // STEP 4: Result
  // ════════════════════════════════════════════════════════════════════════

  if (step === 4) {
    const layoutCfg = gridType ? LAYOUT_CONFIG[gridType] : null;

    const buildCanvas = async (): Promise<Blob | null> => {
      const bgHex = frameColorHex;
      const OUTPUT_WIDTH = 1080;
      const PADDING = tc.pad;
      const GRID_GAP = tc.gap;

      const getLayoutCells = (gt: GridLayoutType) => {
        const gw = OUTPUT_WIDTH - 2 * PADDING;
        if (gt === "G2_GRID") {
          const col = Math.floor((gw - GRID_GAP) / 2);
          const col1 = gw - col - GRID_GAP;
          const row = col;
          return [
            { x: PADDING,               y: PADDING,               w: col,  h: row },
            { x: PADDING+col+GRID_GAP,  y: PADDING,               w: col1, h: row },
            { x: PADDING,               y: PADDING+row+GRID_GAP,  w: col,  h: row },
            { x: PADDING+col+GRID_GAP,  y: PADDING+row+GRID_GAP,  w: col1, h: row },
          ];
        } else if (gt === "G6_GRID") {
          const col = Math.floor((gw - GRID_GAP) / 2);
          const col1 = gw - col - GRID_GAP;
          const row = Math.floor((col * 3 - 2 * GRID_GAP) / 3);
          const cells = [];
          for (let r = 0; r < 3; r++)
            for (let c = 0; c < 2; c++)
              cells.push({ x: PADDING + c*(col+GRID_GAP), y: PADDING + r*(row+GRID_GAP), w: c===0?col:col1, h: row });
          return cells;
        } else if (gt === "G3_GRID") {
          const col = Math.floor((gw - 2 * GRID_GAP) / 3);
          const colR = gw - 2*col - 2*GRID_GAP;
          const cells = [];
          for (let r = 0; r < 3; r++)
            for (let c = 0; c < 3; c++) {
              const w = c === 2 ? colR : col;
              cells.push({ x: PADDING + c*(col+GRID_GAP), y: PADDING + r*(col+GRID_GAP), w, h: col });
            }
          return cells;
        } else if (gt === "G2") {
          const col = Math.floor((gw - 2 * GRID_GAP) / 3);
          const colR = gw - 2 * col - 2 * GRID_GAP;
          const px0 = PADDING, px1 = PADDING + col + GRID_GAP, px2 = PADDING + 2 * (col + GRID_GAP);
          const py0 = PADDING, py1 = PADDING + col + GRID_GAP;
          return [
            { x: px0, y: py0, w: col * 2 + GRID_GAP, h: col },
            { x: px2, y: py0, w: colR, h: col },
            { x: px0, y: py1, w: col, h: col },
            { x: px1, y: py1, w: col + GRID_GAP + colR, h: col },
          ];
        } else if (gt === "G6") {
          const col = Math.floor((gw - 2 * GRID_GAP) / 3);
          const colR = gw - 2 * col - 2 * GRID_GAP;
          const px0 = PADDING, px1 = PADDING + col + GRID_GAP, px2 = PADDING + 2 * (col + GRID_GAP);
          const py0 = PADDING, py1 = PADDING + col + GRID_GAP, py2 = PADDING + 2 * (col + GRID_GAP);
          return [
            { x: px0, y: py0, w: col, h: col },
            { x: px1, y: py0, w: col, h: col },
            { x: px2, y: py0, w: colR, h: col },
            { x: px0, y: py1, w: col * 2 + GRID_GAP, h: col * 2 + GRID_GAP },
            { x: px2, y: py1, w: colR, h: col },
            { x: px2, y: py2, w: colR, h: col },
          ];
        } else {
          // G3
          const col = Math.floor((gw - 3 * GRID_GAP) / 4);
          const px0 = PADDING, px1 = PADDING + col + GRID_GAP, px2 = PADDING + 2*(col+GRID_GAP), px3 = PADDING + 3*(col+GRID_GAP);
          const py0 = PADDING, py1 = PADDING + col + GRID_GAP, py2 = PADDING + 2*(col+GRID_GAP);
          const wide = col * 2 + GRID_GAP;
          return [
            { x: px0, y: py0, w: wide, h: col },
            { x: px2, y: py0, w: col,  h: col },
            { x: px3, y: py0, w: col,  h: col },
            { x: px0, y: py1, w: col,  h: col },
            { x: px1, y: py1, w: wide, h: col },
            { x: px3, y: py1, w: col,  h: col },
            { x: px0, y: py2, w: col,  h: col },
            { x: px1, y: py2, w: col,  h: col },
            { x: px2, y: py2, w: wide, h: col },
          ];
        }
      };

      const cells = getLayoutCells(gridType!);
      const maxBottom = Math.max(...cells.map((c) => c.y + c.h));
      const outputHeight = maxBottom + PADDING;

      const images = await Promise.all(
        slots.map(async (slot) => {
          if (!slot?.url) return null;
          try {
            const res = await fetch(slot.url);
            const blob = await res.blob();
            const objUrl = URL.createObjectURL(blob);
            const img = new Image();
            img.src = objUrl;
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = reject;
            });
            URL.revokeObjectURL(objUrl);
            return img;
          } catch {
            return null;
          }
        })
      );

      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_WIDTH;
      canvas.height = outputHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = bgHex;
      ctx.fillRect(0, 0, OUTPUT_WIDTH, outputHeight);

      images.forEach((img, i) => {
        if (!img || !cells[i]) return;
        const { x, y, w, h } = cells[i];
        const srcAspect = img.naturalWidth / img.naturalHeight;
        const targetAspect = w / h;
        let sx: number, sy: number, sw: number, sh: number;
        if (srcAspect > targetAspect) {
          sh = img.naturalHeight;
          sw = sh * targetAspect;
          sy = 0;
          sx = (img.naturalWidth - sw) / 2;
        } else {
          sw = img.naturalWidth;
          sh = sw / targetAspect;
          sx = 0;
          sy = (img.naturalHeight - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
      });

      return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    };

    const handleDownload = async () => {
      if (isDownloading || slots.filter(Boolean).length === 0) return;
      setIsDownloading(true);
      try {
        const blob = await buildCanvas();
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `colorwork_${projectId}.png`;
        a.click();
        URL.revokeObjectURL(url);
      } finally {
        setIsDownloading(false);
      }
    };

    const handleShare = async () => {
      if (isDownloading || slots.filter(Boolean).length === 0) return;
      setIsDownloading(true);
      try {
        const blob = await buildCanvas();
        if (!blob) return;
        const file = new File([blob], `colorwork_${projectId}.png`, { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: "컬러워크" });
        }
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        throw e;
      } finally {
        setIsDownloading(false);
      }
    };

    return (
      <div className="flex flex-col h-full animate-fade-in relative bg-gray-50 text-gray-900">
        <StatusBar theme="light" />
        <div className="px-4 py-3 flex justify-between items-center relative z-50">
          <div className="flex items-center gap-1">
            {initialStep === 4 ? (
              <button
                onClick={() => router.push("/recent")}
                className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft />
              </button>
            ) : (
              <button
                onClick={() => setStep(3)}
                className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft />
              </button>
            )}
            <button
              onClick={openMenu}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Menu size={22} />
            </button>
          </div>
          <span className="font-bold text-lg">컬러워크</span>
          <div className="w-10" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto no-scrollbar">
          {/* 결과 미리보기 */}
          <div
            className={`${tc.rounded} shadow-2xl mb-4 w-full max-w-[320px] relative overflow-hidden ring-4 ring-white/20`}
            style={{
              aspectRatio: layoutCfg?.containerStyle.aspectRatio ?? "1/1",
              backgroundColor: frameColorHex,
            }}
          >
            <div
              className="absolute inset-0 grid overflow-hidden"
              style={{
                gridTemplateAreas: layoutCfg?.containerStyle.gridTemplateAreas,
                gridTemplateColumns: layoutCfg?.containerStyle.gridTemplateColumns,
                gridTemplateRows: layoutCfg?.containerStyle.gridTemplateRows,
                gap: `${tc.gap}px`,
                padding: `${tc.pad}px`,
              }}
            >
              {slots.map((slot, i) => (
                <div
                  key={i}
                  className="relative min-h-0 min-w-0 bg-gray-200 overflow-hidden"
                  style={{ gridArea: layoutCfg ? LAYOUT_CONFIG[gridType!].areas[i] : undefined }}
                >
                  {slot?.url && (
                    <img
                      src={slot.url}
                      alt="filled slot"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <p className="text-gray-500 text-sm font-medium text-center mt-1">
            #컬러워크 #{selectedApiPalette?.colors[0]?.name ?? "mood"} #
            {slots.length}cuts
          </p>
        </div>

        <div className="p-6 pb-safe safe-area-bottom space-y-3 bg-white border-t border-gray-100">
          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex-1 flex items-center justify-center gap-2 py-4 bg-black text-white font-medium rounded-xl shadow-xl hover:bg-gray-900 active:scale-95 transition-all disabled:opacity-50 text-base"
            >
              {isDownloading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Download size={18} />
              )}
              다운로드
            </button>
            <button
              onClick={handleShare}
              disabled={isDownloading}
              className="flex-1 flex items-center justify-center gap-2 py-4 bg-white text-black font-medium rounded-xl shadow border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50 text-base"
            >
              <Share2 size={18} />
              공유
            </button>
          </div>
          <button
            onClick={() => router.replace("/")}
            className="w-full py-3 text-gray-500 text-sm font-bold hover:text-gray-800 transition-colors"
          >
            홈으로
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default ColorWorkResumeFlow;
