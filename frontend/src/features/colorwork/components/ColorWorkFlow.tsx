"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Palette,
  Camera,
  RefreshCcw,
  Download,
  Share2,
  Menu,
  Maximize2,
  Square,
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
import { projectService } from "@/lib/api/projectService";
import { useAuth } from "@/lib/context/AuthContext";
import { useUI } from "@/lib/context/UIContext";
import { ColorPalette as ApiColorPalette } from "@/lib/api/types";
import {
  GridLayoutType,
  LAYOUT_CONFIG,
  THICKNESS_CONFIG,
} from "../layoutConfig";

import { UploadSlot } from "../types";

// ─── Component ─────────────────────────────────────────────────────────────

const ColorWorkFlow = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isLoggedIn } = useAuth();
  const { openMenu } = useUI();

  // ── mode & step ──
  const [mode, setMode] = useState<"guide" | "actual">("guide");
  const [step, setStep] = useState(0);

  // ── project ──
  const [projectId, setProjectId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // ── palette (API) ──
  const [apiPalettes, setApiPalettes] = useState<ApiColorPalette[]>([]);
  const [selectedApiPalette, setSelectedApiPalette] =
    useState<ApiColorPalette | null>(null);
  const [isPalettesLoading, setIsPalettesLoading] = useState(false);

  // ── grid ──
  const [gridType, setGridType] = useState<GridLayoutType | null>(null);

  // ── slots ──
  const [slots, setSlots] = useState<(UploadSlot | null)[]>([]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  // ── result ──
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isNoticeVisible, setIsNoticeVisible] = useState(false);
  const [frameColor, setFrameColor] = useState<string>("#FFFFFF");
  const [frameThickness, setFrameThickness] = useState<
    "none" | "thin" | "medium"
  >("thin");
  const [cornerStyle, setCornerStyle] = useState<"sharp" | "rounded">("sharp");
  const [activeTab, setActiveTab] = useState<"color" | "width" | "radius">("color");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showDesignSheet, setShowDesignSheet] = useState(false);

  // ── frame modal ──
  const [frameModalStep, setFrameModalStep] = useState<
    "closed" | "confirm" | "select"
  >("closed");

  // ── leave confirm (홈 플로우 step 3 뒤로가기) ──
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // ── 임시저장 완료 modal ──
  const [showSaveComplete, setShowSaveComplete] = useState(false);

  // ── 프레임 스타일 (공통) ──────────────────────────────────────────────────
  const tc = THICKNESS_CONFIG[frameThickness];
  const frameColorHex = frameColor;

  // ── file upload ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const pendingSlotIndex = useRef<number>(-1);

  // ── 세션 복원 (새로고침 시 이전 step 유지, 클라이언트 라우팅 진입 시엔 가이드 표시) ──
  useEffect(() => {
    // cw_page_active: 이 컴포넌트가 마운트된 적 있으면 true
    // - 하드 새로고침: cleanup 미실행 → 플래그 남아있음 → 세션 복원
    // - 클라이언트 라우팅(router.push): cleanup 실행 → 플래그 없음 → 가이드 표시
    const isReload = sessionStorage.getItem("cw_page_active") === "true";
    sessionStorage.setItem("cw_page_active", "true");

    if (!isReload) {
      // 홈 등에서 새로 진입 → 세션 초기화 후 가이드 표시
      sessionStorage.removeItem("cw_session");
      return () => {
        sessionStorage.removeItem("cw_page_active");
      };
    }

    // 새로고침 → 이전 플로우 복원
    try {
      const raw = sessionStorage.getItem("cw_session");
      if (!raw)
        return () => {
          sessionStorage.removeItem("cw_page_active");
        };
      const s = JSON.parse(raw);
      if (!s?.step || s.step < 1 || s.step > 3)
        return () => {
          sessionStorage.removeItem("cw_page_active");
        };
      setMode("actual");
      setStep(s.step);
      if (s.selectedApiPalette) setSelectedApiPalette(s.selectedApiPalette);
      if (s.gridType) {
        setGridType(s.gridType);
        const count =
          (LAYOUT_CONFIG as Record<string, { slotCount: number }>)[s.gridType]
            ?.slotCount ?? 9;
        setSlots(Array(count).fill(null));
      }
      if (s.projectId) setProjectId(s.projectId);
      if (s.cornerStyle) setCornerStyle(s.cornerStyle);
      if (s.frameColor) setFrameColor(s.frameColor);
      if (s.frameThickness) setFrameThickness(s.frameThickness);
    } catch {}
    // 팔레트 목록은 항상 새로 로드
    colorworkService.shufflePalette(0).then((res) => {
      setApiPalettes(res?.palettes ?? []);
    });
    return () => {
      sessionStorage.removeItem("cw_page_active");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 세션 저장 (step / palette / gridType 변경 시)
  useEffect(() => {
    if (mode !== "actual" || step < 1 || step > 3) return;
    try {
      sessionStorage.setItem(
        "cw_session",
        JSON.stringify({ step, selectedApiPalette, gridType, projectId, cornerStyle, frameColor, frameThickness })
      );
    } catch {}
  }, [mode, step, selectedApiPalette, gridType, projectId]);

  // ── 새로고침 / 탭 닫기 방어 ──────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "actual" || step < 1 || step > 3) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [mode, step]);

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

  // ── Initialize ──────────────────────────────────────────────────────────

  const fetchPalettes = useCallback(async () => {
    setIsPalettesLoading(true);
    try {
      const res = await colorworkService.shufflePalette(0);
      setApiPalettes(res?.palettes ?? []);
    } finally {
      setIsPalettesLoading(false);
    }
  }, []);

  // ── Guide helpers ────────────────────────────────────────────────────────

  const startProject = useCallback(async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      await fetchPalettes();
      setMode("actual");
      setStep(1);
    } finally {
      setIsCreating(false);
    }
  }, [isCreating, fetchPalettes]);

  // ── 저장 (임시저장 / 완성하기 시점에만 호출) ─────────────────────────────
  const createAndSaveProject = useCallback(
    async (updateUrl = true): Promise<number | null> => {
      // 프로젝트 생성 (없으면)
      let pid = projectId;
      if (!pid) {
        try {
          const project = await colorworkService.createProject();
          pid = project.id;
          setProjectId(pid);
        } catch {
          return null;
        }
      }

      try {
        await colorworkService.markHowtoSeen(pid);
      } catch {}
      if (selectedApiPalette) {
        try {
          await colorworkService.selectPalette(pid, {
            seed: selectedApiPalette.seed,
            colors: selectedApiPalette.colors,
          });
        } catch {}
      }
      // selectGrid → 기존 frame 전부 삭제 후 아래에서 재바인딩
      if (gridType) {
        try {
          await colorworkService.selectGrid(pid, gridType);
        } catch {}
      }
      if (updateUrl) router.replace(`/colorwork?projectId=${pid}`);

      // 모든 슬롯 바인딩 — 순차 처리로 누락 방지
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        if (!slot) continue;
        try {
          let assetId = slot.assetId;
          if (slot.file) {
            const asset = await assetService.uploadAsset(pid!, slot.file);
            assetId = asset.id;
            setSlots((prev) => {
              const next = [...prev];
              // blob URL 유지 — canvas 렌더링 시 CORS 없이 로딩 가능
              next[i] = { ...prev[i]!, assetId: asset.id };
              return next;
            });
          }
          if (assetId) {
            await colorworkService.bindFrame(pid!, i, assetId);
          }
        } catch (e) {
          console.error(`slot ${i} 저장 실패:`, e);
        }
      }

      try {
        await colorworkService.saveFrameStyle(pid, { frameColor, frameThickness, cornerStyle });
      } catch {}

      return pid;
    },
    [projectId, selectedApiPalette, gridType, slots, router, frameColor, frameThickness, cornerStyle]
  );

  // ── Palette ──────────────────────────────────────────────────────────────

  const handleRefreshPalettes = async () => {
    await fetchPalettes();
    setSelectedApiPalette(null);
  };

  const handleSelectPalette = (palette: ApiColorPalette) => {
    setSelectedApiPalette(palette);
    // 자동저장 없음 — 임시저장 / 완성하기 시점에만 DB에 반영
  };

  // ── Grid ─────────────────────────────────────────────────────────────────

  const handleGridSelect = (type: GridLayoutType) => {
    setGridType(type);
    setSlots(Array(LAYOUT_CONFIG[type].slotCount).fill(null));
    // 자동저장 없음 — 임시저장 / 완성하기 시점에만 DB에 반영
  };

  // ── Upload ───────────────────────────────────────────────────────────────

  const handleSlotClick = (index: number) => {
    pendingSlotIndex.current = index;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const idx = pendingSlotIndex.current;
    if (!file || idx < 0) return;
    e.target.value = "";
    pendingSlotIndex.current = -1;

    // 로컬 미리보기만 표시 — 업로드는 임시저장 / 완성하기 시점에만
    const localUrl = URL.createObjectURL(file);
    setSlots((prev) => {
      const next = [...prev];
      next[idx] = { url: localUrl, file };
      return next;
    });
  };

  // ── Canvas 빌드 (썸네일 업로드 + step4 다운로드 공용) ────────────────────
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
        const col1 = gw - col - GRID_GAP;
        const row = col;
        return [
          { x: PADDING, y: PADDING, w: col, h: row },
          { x: PADDING + col + GRID_GAP, y: PADDING, w: col1, h: row },
          { x: PADDING, y: PADDING + row + GRID_GAP, w: col, h: row },
          {
            x: PADDING + col + GRID_GAP,
            y: PADDING + row + GRID_GAP,
            w: col1,
            h: row,
          },
        ];
      } else if (gt === "G6_GRID") {
        const col = Math.floor((gw - GRID_GAP) / 2);
        const col1 = gw - col - GRID_GAP;
        const row = Math.floor((col * 3 - 2 * GRID_GAP) / 3);
        const cells = [];
        for (let r = 0; r < 3; r++)
          for (let c = 0; c < 2; c++)
            cells.push({
              x: PADDING + c * (col + GRID_GAP),
              y: PADDING + r * (row + GRID_GAP),
              w: c === 0 ? col : col1,
              h: row,
            });
        return cells;
      } else if (gt === "G3_GRID") {
        const col = Math.floor((gw - 2 * GRID_GAP) / 3);
        const colR = gw - 2 * col - 2 * GRID_GAP;
        const cells = [];
        for (let r = 0; r < 3; r++)
          for (let c = 0; c < 3; c++) {
            const w = c === 2 ? colR : col;
            cells.push({
              x: PADDING + c * (col + GRID_GAP),
              y: PADDING + r * (col + GRID_GAP),
              w,
              h: col,
            });
          }
        return cells;
      } else if (gt === "G2") {
        const col = Math.floor((gw - 2 * GRID_GAP) / 3);
        const colR = gw - 2 * col - 2 * GRID_GAP;
        const px0 = PADDING,
          px1 = PADDING + col + GRID_GAP,
          px2 = PADDING + 2 * (col + GRID_GAP);
        const py0 = PADDING,
          py1 = PADDING + col + GRID_GAP;
        return [
          { x: px0, y: py0, w: col * 2 + GRID_GAP, h: col },
          { x: px2, y: py0, w: colR, h: col },
          { x: px0, y: py1, w: col, h: col },
          { x: px1, y: py1, w: col + GRID_GAP + colR, h: col },
        ];
      } else if (gt === "G6") {
        const col = Math.floor((gw - 2 * GRID_GAP) / 3);
        const colR = gw - 2 * col - 2 * GRID_GAP;
        const px0 = PADDING,
          px1 = PADDING + col + GRID_GAP,
          px2 = PADDING + 2 * (col + GRID_GAP);
        const py0 = PADDING,
          py1 = PADDING + col + GRID_GAP,
          py2 = PADDING + 2 * (col + GRID_GAP);
        return [
          { x: px0, y: py0, w: col, h: col },
          { x: px1, y: py0, w: col, h: col },
          { x: px2, y: py0, w: colR, h: col },
          { x: px0, y: py1, w: col * 2 + GRID_GAP, h: col * 2 + GRID_GAP },
          { x: px2, y: py1, w: colR, h: col },
          { x: px2, y: py2, w: colR, h: col },
        ];
      } else {
        const col = Math.floor((gw - 3 * GRID_GAP) / 4);
        const px0 = PADDING,
          px1 = PADDING + col + GRID_GAP,
          px2 = PADDING + 2 * (col + GRID_GAP),
          px3 = PADDING + 3 * (col + GRID_GAP);
        const py0 = PADDING,
          py1 = PADDING + col + GRID_GAP,
          py2 = PADDING + 2 * (col + GRID_GAP);
        const wide = col * 2 + GRID_GAP;
        return [
          { x: px0, y: py0, w: wide, h: col },
          { x: px2, y: py0, w: col, h: col },
          { x: px3, y: py0, w: col, h: col },
          { x: px0, y: py1, w: col, h: col },
          { x: px1, y: py1, w: wide, h: col },
          { x: px3, y: py1, w: col, h: col },
          { x: px0, y: py2, w: col, h: col },
          { x: px1, y: py2, w: col, h: col },
          { x: px2, y: py2, w: wide, h: col },
        ];
      }
    };

    const cells = getLayoutCells(gridType);
    const maxBottom = Math.max(...cells.map((c) => c.y + c.h));
    const outputHeight = maxBottom + PADDING;

    const images = await Promise.all(
      slots.map(async (slot) => {
        if (!slot?.url) return null;
        try {
          const img = new Image();
          // blob URL은 same-origin이므로 crossOrigin 불필요
          img.src = slot.url;
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

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_WIDTH;
    canvas.height = outputHeight;
    const ctx = canvas.getContext("2d")!;

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

    return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  }, [gridType, slots, frameColorHex, tc, cornerStyle]);

  // ── Complete / Render ────────────────────────────────────────────────────

  const handleComplete = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setCompleteError(null);
    try {
      if (!isLoggedIn) {
        setStep(4);
        return;
      }
      let pid = projectId;
      if (!pid) {
        pid = await createAndSaveProject(false);
        if (!pid) return;
      }
      try {
        await colorworkService.complete(pid);
      } catch (e) {
        console.error("complete 저장 실패:", e);
      }
      const blob = await buildCanvas();
      if (!blob) {
        setCompleteError("이미지 생성에 실패했어요. 다시 시도해주세요.");
        return;
      }
      try {
        await colorworkService.uploadThumbnail(pid, blob);
      } catch {
        setCompleteError("저장에 실패했어요. 다시 시도해주세요.");
        return;
      }
      sessionStorage.removeItem("cw_session");
      setIsNoticeVisible(false);
      setTimeout(() => setIsNoticeVisible(true), 400);
      setStep(4);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Leave confirm modal ──────────────────────────────────────────────────

  const renderLeaveModal = () =>
    showLeaveConfirm ? (
      <div
        className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
        onClick={() => setShowLeaveConfirm(false)}
      >
        <div
          className="bg-white w-full rounded-3xl p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center text-center mb-6">
            <h2 className="text-xl font-black text-gray-900">
              레이아웃 선택으로 돌아갈까요?
            </h2>
            <p className="text-sm text-gray-500 font-medium mt-2">
              업로드한 사진이 초기화돼요.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowLeaveConfirm(false)}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-2xl text-sm font-bold hover:bg-gray-200 transition-colors"
            >
              취소
            </button>
            <button
              onClick={() => {
                setShowLeaveConfirm(false);
                setSlots(Array(LAYOUT_CONFIG[gridType!].slotCount).fill(null));
                setFrameColor("#FFFFFF");
                setFrameThickness("thin");
                setCornerStyle("sharp");
                setActiveTab("color");
                setShowColorPicker(false);
                setStep(2);
              }}
              className="flex-1 py-3 bg-black text-white rounded-2xl text-sm font-bold hover:bg-gray-800 transition-colors"
            >
              뒤로가기
            </button>
          </div>
        </div>
      </div>
    ) : null;

  // ════════════════════════════════════════════════════════════════════════
  // GUIDE FLOW
  // ════════════════════════════════════════════════════════════════════════

  // 가이드 데모용 샘플 이미지
  const DEMO_IMGS = [
    "/images/layout-previews/demo_0.JPG",
    "/images/layout-previews/demo_1.JPG",
    "/images/layout-previews/demo_2.JPG",
    "/images/layout-previews/demo_3.JPG",
  ];

  if (mode === "guide") {
    // ── Step 0: 인트로 ──────────────────────────────────────────────────────
    if (step === 0) {
      return (
        <div className="flex flex-col h-full bg-white animate-fade-in relative pb-safe items-center text-center">
          <StatusBar theme="dark" />
          <div className="absolute top-12 left-4 z-10">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
            >
              <ChevronLeft size={24} />
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center px-6 mt-10">
            <div className="w-20 h-20 bg-gradient-to-tr from-red-500 via-orange-500 to-yellow-500 rounded-[2rem] flex items-center justify-center mb-8 shadow-xl shadow-red-200">
              <Palette className="text-white" size={36} />
            </div>
            <h1 className="text-2xl font-black mb-4 leading-tight tracking-tight text-gray-900">
              일상적인 공간을
              <br />
              새롭게 관찰해보세요
            </h1>
            <p className="text-gray-500 font-medium text-sm mb-12 break-keep leading-relaxed px-2">
              오늘 나의 기분에 맞는{" "}
              <span className="font-bold text-gray-900">색상 하나를 선택</span>
              하고,
              <br />
              하루 동안 일상 속에서 그 색상을 찾아
              <br />
              사진으로 기록해보세요.
              <br />
              <br />
              무심코 지나쳤던 주변 환경에 대한 민감도를 높이고,
              <br />
              잠자던 시각적 감각을 일깨워줍니다.
            </p>
          </div>
          <div className="w-full p-6 pb-safe mb-4 flex flex-col gap-4 relative z-50">
            <Button size="lg" onClick={() => setStep(1)}>
              사용법 알아보기
            </Button>
            <button
              onClick={startProject}
              disabled={isCreating}
              className="text-xs font-bold text-gray-400 underline underline-offset-4 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              {isCreating ? "준비 중..." : "건너뛰기"}
            </button>
          </div>
        </div>
      );
    }

    // ── 가이드 공통 데이터 & 헬퍼 ──────────────────────────────────────────
    const GUIDE_PAL_SEL = {
      seed: "SUNSET",
      colors: [{ hex: "#E8553A", name: "SUNSET" }],
    };
    const GUIDE_PALS = [
      GUIDE_PAL_SEL,
      { seed: "DUSK", colors: [{ hex: "#E8933A", name: "DUSK" }] },
      { seed: "OCEAN", colors: [{ hex: "#4BAEED", name: "OCEAN" }] },
    ] as ApiColorPalette[];
    const G_TC = THICKNESS_CONFIG["thin"];
    const G_FRAME = "#FFFFFF";
    const G_LAYOUT = LAYOUT_CONFIG["G2"];

    const gTooltip = (text: string) => (
      <div className="flex flex-col items-center gap-1 mt-3">
        <div className="w-px h-4 bg-white/40" />
        <div className="bg-white text-gray-900 px-5 py-2.5 rounded-2xl font-bold text-sm shadow-2xl max-w-[220px] text-center leading-snug break-keep">
          {text}
        </div>
      </div>
    );
    const gNav = (prev: () => void, next?: () => void, nextLabel = "다음") => (
      <div className="absolute bottom-0 inset-x-0 z-50 px-6 pb-safe pt-4 flex items-center justify-between">
        <button
          onClick={prev}
          className="text-white/70 font-bold text-sm px-4 py-2 rounded-xl hover:bg-white/10 transition-colors"
        >
          이전
        </button>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                s === step ? "w-5 bg-white" : "w-1.5 bg-white/30"
              }`}
            />
          ))}
        </div>
        {next ? (
          <button
            onClick={next}
            className="bg-white text-gray-900 font-bold text-sm px-5 py-2.5 rounded-xl shadow hover:bg-gray-100 transition-colors"
          >
            {nextLabel}
          </button>
        ) : (
          <div className="w-[85px]" />
        )}
      </div>
    );
    const gSkip = () => (
      <div className="absolute top-12 right-6 z-50">
        <button
          onClick={startProject}
          disabled={isCreating}
          className="text-xs font-bold text-white/60 underline underline-offset-4 disabled:opacity-40"
        >
          {isCreating ? "준비 중..." : "건너뛰기"}
        </button>
      </div>
    );

    // ── Step 1: 색상 선택 ────────────────────────────────────────────────
    if (step === 1) {
      return (
        <div className="flex flex-col h-full bg-white animate-fade-in relative overflow-hidden">
          {/* 실제 플로우 UI를 그대로 복사, pointer-events-none으로 freeze */}
          <div className="absolute inset-0 pointer-events-none flex flex-col bg-white z-0">
            {/* StatusBar + 네비바: 함께 어둡게 */}
            <div className="relative">
              <StatusBar theme="dark" />
              <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 -ml-2">
                    <Menu size={24} />
                  </div>
                  <span className="text-xl font-black tracking-tight">
                    Smoodee
                  </span>
                </div>
              </div>
              <div className="absolute inset-0 bg-black/35 z-10" />
            </div>
            {/* 제목: 어둡게 */}
            <div className="relative">
              <div className="px-6 pt-6 pb-2">
                <div className="flex items-start gap-2">
                  <div className="mt-1 p-2 -ml-2 shrink-0">
                    <ChevronLeft />
                  </div>
                  <div>
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
                </div>
              </div>
              <div className="absolute inset-0 bg-black/35 z-10" />
            </div>
            {/* 팔레트 영역: 오버레이 + 카드만 스포트라이트(z-20) */}
            <div className="flex-1 px-6 flex flex-col justify-center py-6 relative">
              <div className="absolute inset-0 bg-black/35 z-10" />
              <div className="relative z-20">
                <div className="absolute -top-7 right-0 flex items-center gap-1 text-[10px] font-bold text-gray-400">
                  <RefreshCcw size={11} /> 새로고침
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {GUIDE_PALS.map((p, i) => (
                    <ColorBlockSelector
                      key={i}
                      color={{ name: p.seed, hex: p.colors[0]?.hex }}
                      isSelected={i === 0}
                      onClick={() => {}}
                    />
                  ))}
                </div>
              </div>
              <div className="relative z-20 flex justify-center mt-4">
                {gTooltip("색상을 골라주세요")}
              </div>
            </div>
            {/* 하단 버튼 없음 */}
          </div>
          {gSkip()}
          {gNav(
            () => setStep(0),
            () => setStep(2)
          )}
        </div>
      );
    }

    // ── Step 2: 레이아웃 선택 ────────────────────────────────────────────
    if (step === 2) {
      return (
        <div className="flex flex-col h-full bg-white animate-fade-in relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none flex flex-col bg-white z-0">
            {/* StatusBar + 네비바: 함께 어둡게 */}
            <div className="relative">
              <StatusBar theme="dark" />
              <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100">
                <div className="p-2 -ml-2">
                  <Menu size={24} />
                </div>
                <span className="text-xl font-black tracking-tight">
                  Smoodee
                </span>
              </div>
              <div className="absolute inset-0 bg-black/35 z-10" />
            </div>
            {/* 제목: 어둡게 */}
            <div className="relative">
              <div className="px-6 pt-6 pb-6">
                <div className="flex items-start gap-2">
                  <div className="mt-1 p-2 -ml-2 shrink-0">
                    <ChevronLeft />
                  </div>
                  <div>
                    <h1 className="text-3xl font-black mb-2">
                      몇 장의 사진을
                      <br />
                      담을까요?
                    </h1>
                    <p className="text-gray-500">원하는 레이아웃을 선택해주세요.</p>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 bg-black/35 z-10" />
            </div>
            {/* 레이아웃 카드: 오버레이 + 카드만 스포트라이트(z-20) */}
            <div className="flex-1 px-6 flex flex-col justify-start pt-4 gap-5 relative">
              <div className="absolute inset-0 bg-black/35 z-10" />
              <div className="relative z-20 flex flex-col gap-5">
                {(
                  [
                    { countLabel: "4장", variants: ["G2", "G2_GRID"] as const },
                    { countLabel: "6장", variants: ["G6", "G6_GRID"] as const },
                    { countLabel: "9장", variants: ["G3", "G3_GRID"] as const },
                  ] as const
                ).map(({ countLabel, variants }) => (
                  <div key={countLabel}>
                    <p className="text-sm font-bold text-gray-500 mb-2">
                      {countLabel}
                    </p>
                    <div
                      className={`flex gap-3${
                        countLabel === "4장" ? " relative" : ""
                      }`}
                    >
                      {countLabel === "4장" && (
                        <div className="absolute -top-12 right-0 pointer-events-none flex flex-col items-end">
                          <div className="bg-white text-gray-900 px-3 py-1 rounded-xl font-bold text-xs shadow-2xl">
                            레이아웃을 선택해 주세요
                          </div>
                          <div className="w-px h-7 bg-white/40 mr-8" />
                        </div>
                      )}
                      {variants.map((type) => {
                        const cfg = LAYOUT_CONFIG[type];
                        const isSel = type === "G2";
                        return (
                          <div
                            key={type}
                            className={`flex-1 border-2 rounded-2xl p-4 flex flex-col items-center gap-3 ${
                              isSel
                                ? "border-black bg-gray-50 shadow-lg"
                                : "border-gray-100 bg-white"
                            }`}
                          >
                            <div
                              className="grid gap-[3px]"
                              style={{
                                gridTemplateAreas: cfg.previewAreas,
                                gridTemplateColumns:
                                  cfg.containerStyle.gridTemplateColumns,
                                gridTemplateRows:
                                  cfg.containerStyle.gridTemplateRows,
                                width: cfg.previewSize.width,
                                height: cfg.previewSize.height,
                              }}
                            >
                              {cfg.previewCells.map((area, i) => {
                                const cellImg = (
                                  cfg as unknown as {
                                    previewCellImages?: string[];
                                  }
                                ).previewCellImages?.[i];
                                return cellImg ? (
                                  <div
                                    key={area}
                                    className="rounded-[2px] overflow-hidden"
                                    style={{ gridArea: area }}
                                  >
                                    <img
                                      src={cellImg}
                                      loading="lazy"
                                      className="w-full h-full object-cover block"
                                    />
                                  </div>
                                ) : (
                                  <div
                                    key={area}
                                    className={`rounded-[2px] ${
                                      isSel ? "bg-gray-400" : "bg-gray-200"
                                    }`}
                                    style={{ gridArea: area }}
                                  />
                                );
                              })}
                            </div>
                            <span
                              className={`text-xs font-bold ${
                                isSel ? "text-gray-900" : "text-gray-400"
                              }`}
                            >
                              {cfg.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* 하단 버튼 없음 */}
          </div>
          {gSkip()}
          {gNav(
            () => setStep(1),
            () => setStep(3)
          )}
        </div>
      );
    }

    // ── Step 3: 이미지 삽입 ──────────────────────────────────────────────
    if (step === 3) {
      const demoFilled = [DEMO_IMGS[0], DEMO_IMGS[1], null, DEMO_IMGS[3]];
      return (
        <div className="flex flex-col h-full bg-white animate-fade-in relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none flex flex-col bg-white z-0">
            {/* StatusBar + 헤더: 함께 어둡게 */}
            <div className="relative">
              <StatusBar theme="dark" />
              <div className="px-4 py-3 flex justify-between items-center border-b border-gray-100">
                <div className="flex items-center gap-1">
                  <div className="p-2 -ml-2"><ChevronLeft /></div>
                  <div className="p-2"><Menu size={22} /></div>
                </div>
                <span className="font-bold">3 / 4 채움</span>
                <div className="w-20" />
              </div>
              <div className="absolute inset-0 bg-black/35 z-10" />
            </div>
            {/* 콘텐츠: 그리드 + 컨트롤 스포트라이트 */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50 relative">
              <div className="absolute inset-0 bg-black/35 z-10" />
              {/* 색상 칩: 어둡게 */}
              <div className="flex items-center gap-3 mb-4 bg-white rounded-2xl px-4 py-2.5 shadow-sm border border-gray-100 shrink-0">
                <div
                  className="w-8 h-8 rounded-lg shrink-0"
                  style={{ backgroundColor: "#E8553A" }}
                />
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    선택한 색상
                  </p>
                  <p className="text-sm font-black text-gray-900">SUNSET</p>
                </div>
              </div>
              {/* 이미지 그리드: 스포트라이트 + 툴팁 */}
              <div
                className="relative z-20 w-4/5 shadow-2xl overflow-hidden"
                style={{
                  aspectRatio: G_LAYOUT.containerStyle.aspectRatio,
                  backgroundColor: G_FRAME,
                }}
              >
                <div
                  className="absolute inset-0 grid"
                  style={{
                    gridTemplateAreas:
                      G_LAYOUT.containerStyle.gridTemplateAreas,
                    gridTemplateColumns:
                      G_LAYOUT.containerStyle.gridTemplateColumns,
                    gridTemplateRows: G_LAYOUT.containerStyle.gridTemplateRows,
                    gap: `${G_TC.gap}px`,
                    padding: `${G_TC.pad}px`,
                  }}
                >
                  {G_LAYOUT.areas.map((area, i) => (
                    <div
                      key={i}
                      className={`relative overflow-hidden flex items-center justify-center ${
                        demoFilled[i]
                          ? "bg-gray-800 "
                          : "bg-gray-100 ring-2 ring-white shadow-[0_0_12px_rgba(255,255,255,0.7)]"
                      }`}
                      style={{ gridArea: area }}
                    >
                      {demoFilled[i] ? (
                        <img
                          src={demoFilled[i]!}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <Camera className="text-gray-500" size={20} />
                          <span className="text-[9px] font-bold text-gray-600">
                            탭하여 추가
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative z-20 flex justify-center w-full">
                {gTooltip("이미지를 채워주세요!")}
              </div>
              {/* 디자인 옵션 컨트롤: 스포트라이트 + 툴팁 */}
              <div className="relative z-20 mt-4 w-full bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
                {/* 탭 - 실제 UI와 동일 */}
                <div className="flex justify-around bg-gray-50 p-1.5 rounded-2xl mb-1">
                  {[
                    { icon: <Palette size={15} />, label: "색상" },
                    { icon: <Maximize2 size={15} />, label: "굵기" },
                    { icon: <Square size={15} />, label: "모서리" },
                  ].map(({ icon, label }, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm ${
                        i === 0 ? "bg-white shadow-sm text-gray-900 font-bold" : "text-gray-400 font-medium"
                      }`}
                    >
                      {icon}{label}
                    </div>
                  ))}
                </div>
                {/* 색상 프리셋 - 실제 UI와 동일 */}
                <div className="h-16 flex items-center justify-center">
                  <div className="flex items-center gap-3">
                    {["#FFFFFF", "#E0E0E0", "#9E9E9E", "#424242", "#000000"].map((hex, i) => (
                      <div
                        key={i}
                        className={`w-11 h-11 rounded-full transition-all ${
                          i === 0 ? "scale-110 ring-2 ring-offset-2 ring-gray-700" : "opacity-70"
                        } ${hex === "#FFFFFF" || hex === "#E0E0E0" ? "border border-gray-200" : ""}`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                    <div
                      className="w-11 h-11 rounded-full border-2 border-dashed border-gray-300 overflow-hidden"
                      style={{ background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)" }}
                    />
                  </div>
                </div>
              </div>
              <div className="relative z-20 flex justify-center w-full">
                {gTooltip("테두리 색상과 굵기를 선택해주세요!")}
              </div>
            </div>
            {/* 하단 버튼 없음 */}
          </div>
          {gSkip()}
          {gNav(
            () => setStep(2),
            () => setStep(4)
          )}
        </div>
      );
    }

    // ── Step 4: 결과 완성 ────────────────────────────────────────────────
    if (step === 4) {
      return (
        <div className="flex flex-col h-full bg-gray-50 animate-fade-in relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none flex flex-col bg-gray-50 z-0">
            {/* StatusBar + 헤더 묶어서 어둡게 */}
            <div className="relative">
              <StatusBar theme="light" />
              <div className="px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <div className="p-2 -ml-2">
                    <ChevronLeft />
                  </div>
                  <div className="p-2">
                    <Menu size={22} />
                  </div>
                </div>
                <span className="font-bold text-lg">컬러워크</span>
                <div className="w-10" />
              </div>
              <div className="absolute inset-0 bg-black/35 z-10" />
            </div>
            {/* 완성 이미지 + 해시태그: 스포트라이트 + 툴팁 */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
              <div className="absolute inset-0 bg-black/35 z-10" />
              <div className="relative z-20 w-full flex flex-col items-center">
                <div
                  className="shadow-2xl mb-4 w-full max-w-[320px] relative overflow-hidden ring-4 ring-white/20"
                  style={{
                    aspectRatio: G_LAYOUT.containerStyle.aspectRatio,
                    backgroundColor: G_FRAME,
                  }}
                >
                  <div
                    className="absolute inset-0 grid overflow-hidden"
                    style={{
                      gridTemplateAreas:
                        G_LAYOUT.containerStyle.gridTemplateAreas,
                      gridTemplateColumns:
                        G_LAYOUT.containerStyle.gridTemplateColumns,
                      gridTemplateRows:
                        G_LAYOUT.containerStyle.gridTemplateRows,
                      gap: `${G_TC.gap}px`,
                      padding: `${G_TC.pad}px`,
                    }}
                  >
                    {DEMO_IMGS.map((src, i) => (
                      <div
                        key={i}
                        className="relative min-h-0 min-w-0 bg-gray-200 overflow-hidden"
                        style={{ gridArea: G_LAYOUT.areas[i] }}
                      >
                        <img
                          src={src}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-gray-500 text-sm font-medium text-center mt-1">
                  #컬러워크 #SUNSET #4cuts
                </p>
                {gTooltip("결과가 완성되었습니다.")}
              </div>
            </div>
            {/* 하단 dim 영역 (nav bar 공간 확보) */}
            <div className="relative pb-safe pt-4 bg-white border-t border-gray-100">
              <div className="absolute inset-0 bg-black/35 z-10" />
              <div className="h-10" />
            </div>
          </div>
          {/* Nav: 이전 + dots + 직접 만들기 (홈으로 자리에 위치) */}
          <div className="absolute bottom-0 inset-x-0 z-50 px-6 pb-safe pt-4 flex items-center justify-between">
            <button
              onClick={() => setStep(3)}
              className="text-white/70 font-bold text-sm px-4 py-2 rounded-xl hover:bg-white/10 transition-colors"
            >
              이전
            </button>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all ${
                    s === step ? "w-5 bg-white" : "w-1.5 bg-white/30"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={startProject}
              disabled={isCreating}
              className="bg-white text-gray-900 font-bold text-sm px-4 py-2.5 rounded-xl shadow hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {isCreating ? "준비 중..." : "직접 만들기"}
            </button>
          </div>
        </div>
      );
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // ACTUAL FLOW
  // ════════════════════════════════════════════════════════════════════════

  // Step 1: Palette selection
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
            <span className="text-xl font-black tracking-tight">Smoodee</span>
          </div>
        </div>
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-start gap-2">
            <button
              onClick={() => {
                sessionStorage.removeItem("cw_session");
                router.replace("/");
              }}
              className="mt-1 p-2 -ml-2 rounded-full hover:bg-gray-100 shrink-0 transition-colors"
            >
              <ChevronLeft />
            </button>
            <div>
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
          </div>
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
        {renderLeaveModal()}
      </div>
    );
  }

  // Step 2: Grid selection
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
          <div className="flex items-start gap-2">
            <button
              onClick={() => setStep(1)}
              className="mt-1 p-2 -ml-2 rounded-full hover:bg-gray-100 shrink-0"
            >
              <ChevronLeft />
            </button>
            <div>
              <h1 className="text-3xl font-black mb-2">
                몇 장의 사진을
                <br />
                담을까요?
              </h1>
              <p className="text-gray-500">원하는 레이아웃을 선택해주세요.</p>
            </div>
          </div>
        </div>
        <div className="flex-1 px-6 py-4 flex flex-col gap-5 overflow-y-auto no-scrollbar">
          {(
            [
              { countLabel: "4장", variants: ["G2", "G2_GRID"] as const },
              { countLabel: "6장", variants: ["G6", "G6_GRID"] as const },
              { countLabel: "9장", variants: ["G3", "G3_GRID"] as const },
            ] as const
          ).map(({ countLabel, variants }) => (
            <div key={countLabel}>
              <p className="text-sm font-bold text-gray-500 mb-2">
                {countLabel}
              </p>
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
                          gridTemplateColumns:
                            cfg.containerStyle.gridTemplateColumns,
                          gridTemplateRows: cfg.containerStyle.gridTemplateRows,
                          width: cfg.previewSize.width,
                          height: cfg.previewSize.height,
                        }}
                      >
                        {cfg.previewCells.map((area, i) => {
                          const cellImg = (
                            cfg as unknown as { previewCellImages?: string[] }
                          ).previewCellImages?.[i];
                          return cellImg ? (
                            <div
                              key={area}
                              className="rounded-[2px] overflow-hidden"
                              style={{ gridArea: area }}
                            >
                              <img
                                src={cellImg}
                                loading="lazy"
                                className="w-full h-full object-cover block"
                              />
                            </div>
                          ) : (
                            <div
                              key={area}
                              className={`rounded-[2px] ${
                                isSelected ? "bg-gray-400" : "bg-gray-200"
                              }`}
                              style={{ gridArea: area }}
                            />
                          );
                        })}
                      </div>
                      <span
                        className={`text-xs font-bold ${
                          isSelected ? "text-gray-900" : "text-gray-400"
                        }`}
                      >
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
        {renderLeaveModal()}
      </div>
    );
  }

  // Step 3: Upload photos
  if (step === 3) {
    const filledCount = slots.filter(Boolean).length;
    const totalSlots = slots.length;
    return (
      <div className="flex flex-col h-full bg-white animate-slide-left relative">
        <StatusBar theme="dark" />
        <div className="px-4 py-3 flex justify-between items-center border-b border-gray-100">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowLeaveConfirm(true)}
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
          {isLoggedIn && <button
            onClick={async () => {
              let pid = projectId;
              if (!pid) {
                setIsCreating(true);
                pid = await createAndSaveProject(false);
                setIsCreating(false);
                if (!pid) return;
              } else {
                try {
                  await colorworkService.saveFrameStyle(pid, { frameColor, frameThickness, cornerStyle });
                } catch {}
              }
              await projectService.updateTitle(
                pid,
                "진행중인 템플릿을 확인해주세요"
              );
              queryClient.invalidateQueries({ queryKey: ["projects"] });
              setShowSaveComplete(true);
            }}
            className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
          >
            임시저장
          </button>}
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
          setFrameColor={setFrameColor}
          setFrameThickness={setFrameThickness}
          setCornerStyle={setCornerStyle}
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
          loginNotice={!isLoggedIn && (
            <p className="text-xs text-gray-400 text-center mt-2">
              <button onClick={() => router.push("/login")} className="text-blue-400 underline underline-offset-2">로그인</button>
              {" "}하면 보관함에 자동 저장돼요
            </p>
          )}
          extraModals={<>
            {showSaveComplete && (
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
            )}
            {renderLeaveModal()}
            {completeError && (
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
            )}
          </>}
        />
      </div>
    );
  }

  // Step 4: Result
  if (step === 4) {
    const layoutCfg = gridType ? LAYOUT_CONFIG[gridType] : null;

    const handleDownload = async () => {
      if (isDownloading || slots.filter(Boolean).length === 0) return;
      setIsDownloading(true);
      try {
        const blob = await buildCanvas();
        if (!blob) return;
        const fileName = `colorwork_${projectId ?? Date.now()}.png`;
        const file = new File([blob], fileName, { type: "image/png" });
        // 모바일: Share API로 사진첩 저장 유도
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: "컬러워크" });
        } else {
          // 데스크탑: 기존 다운로드
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          a.click();
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
        const file = new File(
          [blob],
          `colorwork_${projectId ?? Date.now()}.png`,
          { type: "image/png" }
        );
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
            <button onClick={() => setStep(3)} className="p-2 -ml-2 rounded-full hover:bg-white/20 transition-colors">
              <ChevronLeft />
            </button>
            <button onClick={openMenu} className="p-2 hover:bg-white/20 rounded-full transition-colors">
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
              <span className="text-gray-400 text-xs font-medium animate-pulse">
                보관함에 저장되었습니다
              </span>
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

export default ColorWorkFlow;
