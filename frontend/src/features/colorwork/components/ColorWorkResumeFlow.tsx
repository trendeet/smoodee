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
  Library,
  ArrowRight,
} from "lucide-react";
import StatusBar from "@/components/ui/StatusBar";
import Button from "@/components/ui/Button";
import ColorBlockSelector from "./ColorBlockSelector";
import ColorWorkStep3Body from "./ColorWorkStep3Body";
import ColorWorkStep4Body from "./ColorWorkStep4Body";
import { colorworkService } from "@/lib/api/colorworkService";
import { assetService } from "@/lib/api/assetService";
import { useAuth } from "@/lib/context/AuthContext";


import { useUI } from "@/lib/context/UIContext";
import { ColorPalette as ApiColorPalette } from "@/lib/api/types";
import { GridLayoutType, LAYOUT_CONFIG, THICKNESS_CONFIG } from "../layoutConfig";

import { UploadSlot } from "../types";

// ─── Local types ───────────────────────────────────────────────────────────

interface Props {
  projectId: number;
  initialStep?: 1 | 2 | 3 | 4;
}

// ─── Component ─────────────────────────────────────────────────────────────

const ColorWorkResumeFlow = ({ projectId, initialStep }: Props) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { openMenu } = useUI();
  const { isLoggedIn } = useAuth();
  const [isNoticeVisible, setIsNoticeVisible] = useState(false);

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
  const [frameColor, setFrameColor] = useState<string>("#FFFFFF");
  const [frameThickness, setFrameThickness] = useState<"none" | "thin" | "medium">("thin");
  const [cornerStyle, setCornerStyle] = useState<"sharp" | "rounded">("sharp");
  const [activeTab, setActiveTab] = useState<"color" | "width" | "radius">("color");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showDesignSheet, setShowDesignSheet] = useState(false);

  // ── result ──
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // ── frame modal ──
  const [showSaveComplete, setShowSaveComplete] = useState(false);

  const [frameModalStep, setFrameModalStep] = useState<
    "closed" | "confirm" | "select"
  >("closed");

  // ── file upload ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const pendingSlotIndex = useRef<number>(-1);

  // ── 프레임 스타일 (공통) ──────────────────────────────────────────────────
  const tc = THICKNESS_CONFIG[frameThickness];
  const frameColorHex = frameColor;

  // ── Canvas 빌드 (ColorWorkFlow와 동일) ──────────────────────────────────
  const buildCanvas = useCallback(async (): Promise<Blob | null> => {
    if (!gridType) return null;
    const bgHex = frameColorHex;
    const OUTPUT_WIDTH = 1080;
    const PADDING = tc.canvasPad;
    const GRID_GAP = tc.canvasGap;
    const getLayoutCells = (gt: GridLayoutType) => {
      const gw = OUTPUT_WIDTH - 2 * PADDING;
      if (gt === "G2_GRID") {
        const col = Math.floor((gw - GRID_GAP) / 2);
        const col1 = gw - col - GRID_GAP; const row = col;
        return [{ x: PADDING, y: PADDING, w: col, h: row }, { x: PADDING+col+GRID_GAP, y: PADDING, w: col1, h: row }, { x: PADDING, y: PADDING+row+GRID_GAP, w: col, h: row }, { x: PADDING+col+GRID_GAP, y: PADDING+row+GRID_GAP, w: col1, h: row }];
      } else if (gt === "G6_GRID") {
        const col = Math.floor((gw - GRID_GAP) / 2); const col1 = gw - col - GRID_GAP; const row = Math.floor((col * 3 - 2 * GRID_GAP) / 3); const cells = [];
        for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) cells.push({ x: PADDING+c*(col+GRID_GAP), y: PADDING+r*(row+GRID_GAP), w: c===0?col:col1, h: row });
        return cells;
      } else if (gt === "G3_GRID") {
        const col = Math.floor((gw - 2*GRID_GAP) / 3); const colR = gw-2*col-2*GRID_GAP; const cells = [];
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) cells.push({ x: PADDING+c*(col+GRID_GAP), y: PADDING+r*(col+GRID_GAP), w: c===2?colR:col, h: col });
        return cells;
      } else if (gt === "G2") {
        const col = Math.floor((gw-2*GRID_GAP)/3); const colR = gw-2*col-2*GRID_GAP;
        const px0=PADDING,px1=PADDING+col+GRID_GAP,px2=PADDING+2*(col+GRID_GAP); const py0=PADDING,py1=PADDING+col+GRID_GAP;
        return [{ x:px0,y:py0,w:col*2+GRID_GAP,h:col },{ x:px2,y:py0,w:colR,h:col },{ x:px0,y:py1,w:col,h:col },{ x:px1,y:py1,w:col+GRID_GAP+colR,h:col }];
      } else if (gt === "G6") {
        const col = Math.floor((gw-2*GRID_GAP)/3); const colR = gw-2*col-2*GRID_GAP;
        const px0=PADDING,px1=PADDING+col+GRID_GAP,px2=PADDING+2*(col+GRID_GAP); const py0=PADDING,py1=PADDING+col+GRID_GAP,py2=PADDING+2*(col+GRID_GAP);
        return [{ x:px0,y:py0,w:col,h:col },{ x:px1,y:py0,w:col,h:col },{ x:px2,y:py0,w:colR,h:col },{ x:px0,y:py1,w:col*2+GRID_GAP,h:col*2+GRID_GAP },{ x:px2,y:py1,w:colR,h:col },{ x:px2,y:py2,w:colR,h:col }];
      } else {
        const col = Math.floor((gw-3*GRID_GAP)/4); const wide = col*2+GRID_GAP;
        const px0=PADDING,px1=PADDING+col+GRID_GAP,px2=PADDING+2*(col+GRID_GAP),px3=PADDING+3*(col+GRID_GAP); const py0=PADDING,py1=PADDING+col+GRID_GAP,py2=PADDING+2*(col+GRID_GAP);
        return [{ x:px0,y:py0,w:wide,h:col },{ x:px2,y:py0,w:col,h:col },{ x:px3,y:py0,w:col,h:col },{ x:px0,y:py1,w:col,h:col },{ x:px1,y:py1,w:wide,h:col },{ x:px3,y:py1,w:col,h:col },{ x:px0,y:py2,w:col,h:col },{ x:px1,y:py2,w:col,h:col },{ x:px2,y:py2,w:wide,h:col }];
      }
    };
    const cells = getLayoutCells(gridType);
    const maxBottom = Math.max(...cells.map((c) => c.y + c.h));
    const outputHeight = maxBottom + PADDING;

    console.log("[buildCanvas] slots:", slots.map((s, i) => ({
      index: i,
      hasSlot: !!s,
      urlType: s?.url?.startsWith("blob:") ? "blob" : s?.url ? "s3" : "없음",
      assetId: s?.assetId,
    })));

    const images = await Promise.all(
      slots.map(async (slot, i) => {
        if (!slot?.url) { console.log(`[buildCanvas] slot[${i}] url 없음 → skip`); return null; }
        try {
          const img = new Image();
          img.src = slot.url; // blob URL — same-origin, CORS 불필요
          await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => { console.error(`[buildCanvas] slot[${i}] 로드 실패`); reject(); }; });
          console.log(`[buildCanvas] slot[${i}] 로드 성공 ${img.naturalWidth}x${img.naturalHeight}`);
          return img;
        } catch { return null; }
      })
    );

    console.log("[buildCanvas] 최종 로드된 이미지 수:", images.filter(Boolean).length, "/", images.length);
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_WIDTH; canvas.height = outputHeight;
    const ctx = canvas.getContext("2d")!;
    const CELL_RADIUS = cornerStyle === "rounded" ? 56 : 0;
    ctx.fillStyle = bgHex; ctx.fillRect(0, 0, OUTPUT_WIDTH, outputHeight);
    images.forEach((img, i) => {
      if (!img || !cells[i]) return;
      const { x, y, w, h } = cells[i];
      const srcAspect = img.naturalWidth / img.naturalHeight; const targetAspect = w / h;
      let sx: number, sy: number, sw: number, sh: number;
      if (srcAspect > targetAspect) { sh = img.naturalHeight; sw = sh * targetAspect; sy = 0; sx = (img.naturalWidth - sw) / 2; }
      else { sw = img.naturalWidth; sh = sw / targetAspect; sx = 0; sy = (img.naturalHeight - sh) / 2; }
      if (CELL_RADIUS > 0) {
        ctx.save(); ctx.beginPath();
        ctx.moveTo(x+CELL_RADIUS,y); ctx.lineTo(x+w-CELL_RADIUS,y); ctx.quadraticCurveTo(x+w,y,x+w,y+CELL_RADIUS);
        ctx.lineTo(x+w,y+h-CELL_RADIUS); ctx.quadraticCurveTo(x+w,y+h,x+w-CELL_RADIUS,y+h);
        ctx.lineTo(x+CELL_RADIUS,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-CELL_RADIUS);
        ctx.lineTo(x,y+CELL_RADIUS); ctx.quadraticCurveTo(x,y,x+CELL_RADIUS,y);
        ctx.closePath(); ctx.clip(); ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h); ctx.restore();
      } else { ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h); }
    });
    return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  }, [gridType, slots, frameColorHex, tc, cornerStyle]);

  // ── 프레임 스타일 즉시 저장 ──────────────────────────────────────────────
  const saveStyle = useCallback(
    (color: string, thickness: "none" | "thin" | "medium", corner: "sharp" | "rounded") => {
      colorworkService.saveFrameStyle(projectId, { frameColor: color, frameThickness: thickness, cornerStyle: corner }).catch(() => {});
    },
    [projectId]
  );

  // ── 색상 피커 외부 클릭 시 닫기 ──────────────────────────────────────────
  useEffect(() => {
    if (!showColorPicker) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [showColorPicker]);

  // 색상 피커 닫힐 때 저장
  const prevShowColorPicker = useRef(false);
  useEffect(() => {
    if (prevShowColorPicker.current && !showColorPicker) {
      saveStyle(frameColor, frameThickness, cornerStyle);
    }
    prevShowColorPicker.current = showColorPicker;
  }, [showColorPicker, frameColor, frameThickness, cornerStyle, saveStyle]);

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
    (async () => {
    try {
      const state = await colorworkService.getState(projectId);
      {
        // Restore palette
        if (state.selectedPaletteSeed && state.selectedColors) {
          setSelectedApiPalette({
            seed: state.selectedPaletteSeed,
            colors: state.selectedColors,
          });
        }

        // Restore grid and slots — S3 URL → blob URL 변환으로 ColorWorkFlow와 동일하게 처리
        if (state.gridType) {
          const gt = state.gridType as GridLayoutType;
          setGridType(gt);
          const slotCount = LAYOUT_CONFIG[gt].slotCount;
          const restored: (UploadSlot | null)[] = Array(slotCount).fill(null);
          await Promise.all(
            state.frames.map(async (f) => {
              if (!f || f.index >= slotCount || !f.assetId) return;
              const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/$/, "");
              try {
                const res = await fetch(`${apiBase}/api/v1/assets/${f.assetId}/stream`);
                if (res.ok) {
                  const blob = await res.blob();
                  restored[f.index] = { assetId: f.assetId, url: URL.createObjectURL(blob) };
                } else {
                  restored[f.index] = { assetId: f.assetId, url: f.assetUrl ?? "" };
                }
              } catch {
                restored[f.index] = { assetId: f.assetId, url: f.assetUrl ?? "" };
              }
            })
          );
          setSlots(restored);
        }

        // Restore frame style
        if (state.frameColor) setFrameColor(state.frameColor);
        if (state.frameThickness) setFrameThickness(state.frameThickness as "none" | "thin" | "medium");
        if (state.cornerStyle) setCornerStyle(state.cornerStyle as "sharp" | "rounded");

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
      }
    } catch {
      router.replace("/inprogress");
    }
    })();
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
        // blob URL 유지 — canvas 렌더링 시 CORS 없이 로딩 가능
        next[idx] = { ...prev[idx]!, assetId: asset.id };
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
    setCompleteError(null);
    try {
      try {
        await colorworkService.complete(projectId);
      } catch (e) {
        console.error("complete 저장 실패:", e);
      }
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      const blob = await buildCanvas();
      if (!blob) {
        setCompleteError("이미지 생성에 실패했어요. 다시 시도해주세요.");
        return;
      }
      try {
        await colorworkService.uploadThumbnail(projectId, blob);
      } catch {
        setCompleteError("저장에 실패했어요. 다시 시도해주세요.");
        return;
      }
      setIsNoticeVisible(false);
      setTimeout(() => setIsNoticeVisible(true), 400);
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
    const layoutCfg3 = gridType ? LAYOUT_CONFIG[gridType] : null;

    return (
      <div className="flex flex-col h-full bg-white animate-slide-left relative">
        <StatusBar theme="dark" />
        <div className="px-4 py-3 flex justify-between items-center border-b border-gray-100">
          <div className="flex items-center gap-1">
            <button onClick={goBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
              <ChevronLeft />
            </button>
            <button onClick={openMenu} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Menu size={22} />
            </button>
          </div>
          <span className="font-bold">{filledCount} / {totalSlots} 채움</span>
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["projects"] });
              setShowSaveComplete(true);
            }}
            className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
          >
            임시저장
          </button>
        </div>
        <ColorWorkStep3Body
          slots={slots}
          selectedApiPalette={selectedApiPalette}
          gridType={gridType}
          frameColor={frameColor}
          frameThickness={frameThickness}
          cornerStyle={cornerStyle}
          activeTab={activeTab}
          showColorPicker={showColorPicker}
          showDesignSheet={showDesignSheet}
          frameModalStep={frameModalStep}
          uploadingIndex={uploadingIndex}
          isSubmitting={isSubmitting}
          setFrameColor={(v) => { setFrameColor(v); saveStyle(v, frameThickness, cornerStyle); }}
          setFrameThickness={(v) => { setFrameThickness(v); saveStyle(frameColor, v, cornerStyle); }}
          setCornerStyle={(v) => { setCornerStyle(v); saveStyle(frameColor, frameThickness, v); }}
          setActiveTab={setActiveTab}
          setShowColorPicker={setShowColorPicker}
          setShowDesignSheet={setShowDesignSheet}
          setFrameModalStep={setFrameModalStep}
          fileInputRef={fileInputRef}
          colorPickerRef={colorPickerRef}
          onSlotClick={handleSlotClick}
          onFileChange={handleFileChange}
          onComplete={handleComplete}
          onGridSelect={handleGridSelect}
          extraModals={showSaveComplete ? (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
              onClick={() => setShowSaveComplete(false)}>
              <div className="bg-white w-full rounded-3xl p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl">💾</span>
                  </div>
                  <h2 className="text-xl font-black text-gray-900">임시저장이 완료되었습니다</h2>
                  <p className="text-sm text-gray-500 font-medium mt-2 break-keep">저장 내용은 진행중인 활동에서 확인할 수 있습니다.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => router.replace("/")}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-2xl text-sm font-bold hover:bg-gray-200 transition-colors">홈으로 이동</button>
                  <button onClick={() => router.replace("/inprogress")}
                    className="flex-1 py-3 bg-black text-white rounded-2xl text-sm font-bold hover:bg-gray-800 transition-colors">진행중인 활동</button>
                </div>
              </div>
            </div>
          ) : completeError ? (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
              onClick={() => setCompleteError(null)}>
              <div className="bg-white w-full rounded-3xl p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <h2 className="text-lg font-black text-gray-900">완성하기 실패</h2>
                  <p className="text-sm text-gray-500 font-medium mt-2 break-keep">{completeError}</p>
                </div>
                <button onClick={() => setCompleteError(null)}
                  className="w-full py-3 bg-black text-white rounded-2xl text-sm font-bold">
                  확인
                </button>
              </div>
            </div>
          ) : undefined}
        />
      </div>
    );
  }


  // ════════════════════════════════════════════════════════════════════════
  // STEP 4: Result
  // ════════════════════════════════════════════════════════════════════════

  if (step === 4) {
    const buildCanvasUnused = async (): Promise<Blob | null> => {
      const bgHex = frameColorHex;
      const OUTPUT_WIDTH = 1080;
      const PADDING = tc.canvasPad;
      const GRID_GAP = tc.canvasGap;

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

      // 서버 이미지를 fetch로 순차 다운로드 → blob URL 변환 → canvas에 그리기
      const blobUrls: (string | null)[] = [];
      for (const slot of slots) {
        if (!slot) { blobUrls.push(null); continue; }
        if (slot.url?.startsWith("blob:")) {
          blobUrls.push(slot.url);
        } else if (slot.assetId) {
          try {
            const res = await fetch(`/api/v1/assets/${slot.assetId}/stream`);
            if (!res.ok) throw new Error(`stream ${res.status}`);
            const blob = await res.blob();
            blobUrls.push(URL.createObjectURL(blob));
          } catch {
            // stream 실패 시 presigned S3 URL 직접 fetch 시도
            try {
              const res = await fetch(slot.url!, { mode: "cors" });
              if (!res.ok) throw new Error(`s3 ${res.status}`);
              const blob = await res.blob();
              blobUrls.push(URL.createObjectURL(blob));
            } catch {
              blobUrls.push(null);
            }
          }
        } else {
          blobUrls.push(null);
        }
      }

      const images = await Promise.all(
        blobUrls.map(async (src) => {
          if (!src) return null;
          try {
            const img = new Image();
            img.src = src;
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = reject;
            });
            return img;
          } catch {
            return null;
          }
        })
      );

      const canvas2 = document.createElement("canvas");
      canvas2.width = OUTPUT_WIDTH;
      canvas2.height = outputHeight;
      const ctx = canvas2.getContext("2d")!;

      const CELL_RADIUS = cornerStyle === "rounded" ? 56 : 0;

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
        if (CELL_RADIUS > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(x + CELL_RADIUS, y);
          ctx.lineTo(x + w - CELL_RADIUS, y);
          ctx.quadraticCurveTo(x + w, y, x + w, y + CELL_RADIUS);
          ctx.lineTo(x + w, y + h - CELL_RADIUS);
          ctx.quadraticCurveTo(x + w, y + h, x + w - CELL_RADIUS, y + h);
          ctx.lineTo(x + CELL_RADIUS, y + h);
          ctx.quadraticCurveTo(x, y + h, x, y + h - CELL_RADIUS);
          ctx.lineTo(x, y + CELL_RADIUS);
          ctx.quadraticCurveTo(x, y, x + CELL_RADIUS, y);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
          ctx.restore();
        } else {
          ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
        }
      });


      return new Promise((resolve) => canvas2.toBlob(resolve, "image/png"));
    };

    const handleDownload = async () => {
      if (isDownloading || slots.filter(Boolean).length === 0) return;
      setIsDownloading(true);
      try {
        const blob = await buildCanvas();
        if (!blob) return;
        const fileName = `colorwork_${projectId}.png`;
        const file = new File([blob], fileName, { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: "컬러워크" });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = fileName; a.click();
          URL.revokeObjectURL(url);
        }
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
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
            <button
              onClick={initialStep === 4 ? () => router.push("/recent") : () => setStep(3)}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft />
            </button>
            <button onClick={openMenu} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Menu size={22} />
            </button>
          </div>
          <span className="font-bold text-lg">컬러워크</span>
          <div className="w-10" />
        </div>
        <ColorWorkStep4Body
          slots={slots}
          selectedApiPalette={selectedApiPalette}
          gridType={gridType}
          frameColorHex={frameColorHex}
          tc={tc}
          cornerStyle={cornerStyle}
          isDownloading={isDownloading}
          onDownload={handleDownload}
          onShare={handleShare}
          onHome={() => router.replace("/")}
          savedNotice={isLoggedIn && (
            <div className={`flex flex-col items-center gap-3 transition-all duration-700 transform ${isNoticeVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
              <span className="text-gray-400 text-xs font-medium animate-pulse">보관함에 저장되었습니다</span>
              <button
                onClick={() => router.replace("/recent")}
                className="group flex items-center justify-center gap-2.5 bg-white border-2 border-black px-7 py-3 rounded-full shadow-[0_10px_20px_-5px_rgba(0,0,0,0.2)] hover:bg-black hover:text-white transition-all active:scale-95"
              >
                <Library className="w-4 h-4 text-black group-hover:text-white transition-colors" />
                <span className="font-extrabold text-sm tracking-tight">보관함 확인하기</span>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          )}
        />
      </div>
    );
  }

  return null;
};

export default ColorWorkResumeFlow;
