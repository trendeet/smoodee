"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Camera,
  RefreshCcw,
  Download,
  Menu,
} from "lucide-react";
import StatusBar from "@/components/ui/StatusBar";
import Button from "@/components/ui/Button";
import ColorBlockSelector from "./ColorBlockSelector";
import { colorworkService } from "@/lib/api/colorworkService";
import { assetService } from "@/lib/api/assetService";
import { useUI } from "@/lib/context/UIContext";
import { ColorPalette as ApiColorPalette } from "@/lib/api/types";

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
  const [gridType, setGridType] = useState<"G2" | "G6" | "G3" | null>(null);

  // ── slots ──
  const [slots, setSlots] = useState<(UploadSlot | null)[]>([]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  // ── step 4 ──
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [frameColor, setFrameColor] = useState<"white" | "black" | "palette">("white");
  const [frameThickness, setFrameThickness] = useState<"none" | "thin" | "medium">("medium");

  // ── frame modal ──
  const [frameModalStep, setFrameModalStep] = useState<
    "closed" | "confirm" | "select"
  >("closed");

  // ── file upload ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingSlotIndex = useRef<number>(-1);

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

        // Restore grid and slots
        if (state.gridType) {
          const gt = state.gridType as "G2" | "G6" | "G3";
          setGridType(gt);
          const slotCount = gt === "G2" ? 4 : gt === "G6" ? 6 : 9;
          const restored: (UploadSlot | null)[] = Array(slotCount).fill(null);
          state.frames.forEach((f) => {
            if (f && f.index < slotCount) {
              restored[f.index] = { assetId: f.assetId, url: f.assetUrl };
            }
          });
          setSlots(restored);
        }

        // Determine step based on actual saved data (not derived howtoSeen flag)
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

  const handleGridSelect = async (type: "G2" | "G6" | "G3") => {
    setGridType(type);
    const count = type === "G2" ? 4 : type === "G6" ? 6 : 9;
    setSlots(Array(count).fill(null));
    await colorworkService.selectGrid(projectId, type);
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
        <div className="flex-1 px-6 flex flex-col justify-center gap-4 overflow-y-auto no-scrollbar">
          {[
            { type: "G2" as const, count: 4, cols: 2, rows: 2, label: "4장" },
            { type: "G6" as const, count: 6, cols: 2, rows: 3, label: "6장" },
            { type: "G3" as const, count: 9, cols: 3, rows: 3, label: "9장" },
          ].map(({ type, count, cols, rows, label }) => (
            <button
              key={type}
              onClick={() => handleGridSelect(type)}
              className={`w-full border-2 rounded-3xl p-5 flex items-center gap-6 transition-all shrink-0 ${
                gridType === type
                  ? "border-black bg-gray-50 shadow-xl"
                  : "border-gray-100 hover:border-gray-200"
              }`}
            >
              <div
                className="grid gap-1.5 shrink-0"
                style={{
                  gridTemplateColumns: `repeat(${cols}, 1fr)`,
                  width: cols * 20 + (cols - 1) * 6,
                  height: rows * 20 + (rows - 1) * 6,
                }}
              >
                {Array(count)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="bg-gray-200 rounded w-5 h-5" />
                  ))}
              </div>
              <span className="font-black text-xl">{label}</span>
              {gridType === type && (
                <div className="ml-auto w-5 h-5 rounded-full bg-black flex items-center justify-center shrink-0">
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path
                      d="M1 4L3.5 6.5L9 1"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </button>
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
          <div
            className={`w-4/5 grid gap-2 p-2 rounded-2xl shadow-2xl bg-white ${
              gridType === "G3" ? "grid-cols-3" : "grid-cols-2"
            }`}
            style={gridType === "G6" ? { aspectRatio: "2/3" } : undefined}
          >
            {slots.map((slot, i) => (
              <div
                key={i}
                onClick={() => uploadingIndex === null && handleSlotClick(i)}
                className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all active:scale-95 ${
                  slot ? "bg-gray-800" : "bg-gray-100 hover:bg-gray-200"
                } flex items-center justify-center`}
              >
                {uploadingIndex === i ? (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : slot?.url ? (
                  <img
                    src={slot.url}
                    alt="slot"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera className="text-gray-400" />
                )}
              </div>
            ))}
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
                  <div className="flex flex-col gap-3">
                    {[
                      { type: "G2" as const, count: 4, cols: 2, rows: 2, label: "4장" },
                      { type: "G6" as const, count: 6, cols: 2, rows: 3, label: "6장" },
                      { type: "G3" as const, count: 9, cols: 3, rows: 3, label: "9장" },
                    ].map(({ type, count, cols, rows, label }) => (
                      <button
                        key={type}
                        onClick={async () => {
                          await handleGridSelect(type);
                          setFrameModalStep("closed");
                        }}
                        className={`w-full border-2 rounded-2xl p-4 flex items-center gap-5 transition-all ${
                          gridType === type
                            ? "border-black bg-gray-50"
                            : "border-gray-100 hover:border-gray-200"
                        }`}
                      >
                        <div
                          className="grid gap-1 shrink-0"
                          style={{
                            gridTemplateColumns: `repeat(${cols}, 1fr)`,
                            width: cols * 18 + (cols - 1) * 4,
                            height: rows * 18 + (rows - 1) * 4,
                          }}
                        >
                          {Array(count)
                            .fill(0)
                            .map((_, i) => (
                              <div
                                key={i}
                                className="bg-gray-200 rounded w-[18px] h-[18px]"
                              />
                            ))}
                        </div>
                        <span className="font-black text-lg">{label}</span>
                      </button>
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
    const resultColor = selectedApiPalette?.colors[0]?.hex ?? "#6366f1";
    const gridClass =
      gridType === "G3"
        ? "grid-cols-3 grid-rows-3"
        : gridType === "G6"
        ? "grid-cols-2 grid-rows-3"
        : "grid-cols-2 grid-rows-2";
    const aspectClass = gridType === "G6" ? "aspect-[2/3]" : "aspect-square";

    const thicknessConfig = {
      none:   { pad: 0,  gap: 0,  cssPad: "p-0",   cssGap: "gap-0",   rounded: "rounded-none" },
      thin:   { pad: 8,  gap: 3,  cssPad: "p-1.5", cssGap: "gap-0.5", rounded: "rounded-lg" },
      medium: { pad: 20, gap: 8,  cssPad: "p-3",   cssGap: "gap-1",   rounded: "rounded-xl" },
    } as const;
    const tc = thicknessConfig[frameThickness];

    const handleDownload = async () => {
      if (isDownloading || slots.filter(Boolean).length === 0) return;
      setIsDownloading(true);
      try {
        const bgHex =
          frameColor === "black"
            ? "#000000"
            : frameColor === "palette"
            ? resultColor
            : "#FFFFFF";

        const OUTPUT_WIDTH = 1080;
        const PADDING = tc.pad;
        const GRID_GAP = tc.gap;
        const cols = gridType === "G3" ? 3 : 2;
        const rows = gridType === "G6" ? 3 : gridType === "G2" ? 2 : 3;
        const cellWidth =
          (OUTPUT_WIDTH - 2 * PADDING - (cols - 1) * GRID_GAP) / cols;
        const cellHeight = cellWidth;
        const outputHeight =
          rows * cellHeight + (rows - 1) * GRID_GAP + 2 * PADDING;

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
          if (!img) return;
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = PADDING + col * (cellWidth + GRID_GAP);
          const y = PADDING + row * (cellHeight + GRID_GAP);

          const srcAspect = img.naturalWidth / img.naturalHeight;
          let sx: number, sy: number, sw: number, sh: number;
          if (srcAspect > 1) {
            sh = img.naturalHeight;
            sw = sh;
            sy = 0;
            sx = (img.naturalWidth - sw) / 2;
          } else {
            sw = img.naturalWidth;
            sh = sw;
            sx = 0;
            sy = (img.naturalHeight - sh) / 2;
          }
          ctx.drawImage(img, sx, sy, sw, sh, x, y, cellWidth, cellHeight);
        });

        canvas.toBlob(async (b) => {
          if (!b) return;
          const fileName = `colorwork_${projectId}.png`;
          const file = new File([b], fileName, { type: "image/png" });
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title: "컬러워크" });
          } else {
            const url = URL.createObjectURL(b);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
          }
        }, "image/png");
      } finally {
        setIsDownloading(false);
      }
    };

    return (
      <div className="flex flex-col h-full animate-fade-in relative bg-gray-50 text-gray-900">
        <StatusBar theme="light" />
        <div className="px-4 py-3 flex justify-between items-center relative z-50">
          <div className="flex items-center gap-1">
            {initialStep !== 4 && (
              <button
                onClick={() => setStep(3)}
                className="p-2 -ml-2 rounded-full hover:bg-white/20 transition-colors"
              >
                <ChevronLeft />
              </button>
            )}
            <button
              onClick={openMenu}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <Menu size={22} />
            </button>
          </div>
          <span className="font-bold text-lg">컬러워크</span>
          <div className="w-10" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto no-scrollbar">
          <div
            className={`${tc.cssPad} ${tc.rounded} shadow-2xl mb-4 w-full max-w-[320px] flex flex-col relative overflow-hidden ring-4 ring-white/20 ${aspectClass}`}
            style={{
              backgroundColor:
                frameColor === "black"
                  ? "#000000"
                  : frameColor === "palette"
                  ? resultColor
                  : "#FFFFFF",
            }}
          >
            <div
              className={`w-full h-full grid overflow-hidden ${tc.cssGap} ${gridClass}`}
            >
              {slots.map((slot, i) => (
                <div
                  key={i}
                  className="relative w-full h-full bg-gray-200 overflow-hidden"
                >
                  {slot?.url && (
                    <img
                      src={slot.url}
                      alt="filled slot"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <p className="text-gray-500 text-sm font-medium text-center">
            #컬러워크 #{selectedApiPalette?.colors[0]?.name ?? "mood"} #
            {slots.length}cuts
          </p>

          <div className="flex items-center gap-3 mt-3">
            {(
              [
                { key: "white" as const, bg: "#FFFFFF", border: true },
                { key: "black" as const, bg: "#000000" },
                { key: "palette" as const, bg: resultColor, border: true },
              ] as { key: "white" | "black" | "palette"; bg: string; border?: boolean }[]
            ).map(({ key, bg, border }) => (
              <button
                key={key}
                onClick={() => setFrameColor(key)}
                className={`w-7 h-7 rounded-full transition-all ${
                  frameColor === key ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : "opacity-70"
                } ${border ? "border border-gray-300" : ""}`}
                style={{ backgroundColor: bg }}
              />
            ))}
          </div>

          <div className="flex items-center gap-2 mt-3">
              {(
                [
                  { key: "none" as const, p: 0, g: 0 },
                  { key: "thin" as const, p: 2, g: 1 },
                  { key: "medium" as const, p: 4, g: 2 },
                ]
              ).map(({ key, p, g }) => (
                <button
                  key={key}
                  onClick={() => setFrameThickness(key)}
                  className={`p-1.5 rounded-xl border-2 transition-all ${
                    frameThickness === key ? "border-gray-700 bg-gray-50" : "border-gray-200"
                  }`}
                >
                  <div
                    className="w-8 h-8 bg-gray-300 flex items-center justify-center"
                    style={{ padding: p }}
                  >
                    <div
                      className="w-full h-full grid grid-cols-2 grid-rows-2"
                      style={{ gap: g }}
                    >
                      {[0,1,2,3].map(i => (
                        <div key={i} className="bg-gray-600 rounded-[1px]" />
                      ))}
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </div>

        <div className="p-6 pb-safe safe-area-bottom space-y-3">
          <Button
            size="lg"
            icon={Download}
            loading={isDownloading}
            onClick={handleDownload}
          >
            다운로드
          </Button>
          <button
            onClick={() => router.replace("/")}
            className="w-full py-3 text-gray-500 text-sm font-bold hover:text-gray-700"
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
