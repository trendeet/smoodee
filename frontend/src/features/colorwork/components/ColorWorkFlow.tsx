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
} from "lucide-react";
import StatusBar from "@/components/ui/StatusBar";
import Button from "@/components/ui/Button";
import ColorBlockSelector from "./ColorBlockSelector";
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

// ─── Local types ───────────────────────────────────────────────────────────

interface UploadSlot {
  assetId?: number;
  url?: string;
  file?: File; // 임시저장 전 로컬 파일 보관용
}

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
  const [isDownloading, setIsDownloading] = useState(false);
  const [frameColor, setFrameColor] = useState<"white" | "black" | "palette">(
    "white"
  );
  const [frameThickness, setFrameThickness] = useState<
    "none" | "thin" | "medium"
  >("thin");

  // ── frame modal ──
  const [frameModalStep, setFrameModalStep] = useState<
    "closed" | "confirm" | "select"
  >("closed");

  // ── leave confirm (홈 플로우 step 3 뒤로가기) ──
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // ── login required modal ──
  const [showLoginRequired, setShowLoginRequired] = useState(false);

  // ── 프레임 스타일 (공통) ──────────────────────────────────────────────────
  const tc = THICKNESS_CONFIG[frameThickness];
  const frameColorHex =
    frameColor === "black"
      ? "#000000"
      : frameColor === "palette"
      ? selectedApiPalette?.colors[
          Math.floor((selectedApiPalette?.colors.length ?? 0) / 2)
        ]?.hex ?? "#e0e0e0"
      : "#FFFFFF";

  // ── file upload ──
  const fileInputRef = useRef<HTMLInputElement>(null);
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
        const count = s.gridType === "G2" ? 4 : s.gridType === "G6" ? 6 : 9;
        setSlots(Array(count).fill(null));
      }
      if (s.projectId) setProjectId(s.projectId);
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
        JSON.stringify({ step, selectedApiPalette, gridType, projectId })
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
          await colorworkService.selectGrid(
            pid,
            LAYOUT_CONFIG[gridType].backendType
          );
        } catch {}
      }
      if (updateUrl) router.replace(`/colorwork?projectId=${pid}`);

      // 모든 슬롯 바인딩 (file은 업로드 후 바인딩, assetId만 있으면 rebind)
      await Promise.allSettled(
        slots.map(async (slot, i) => {
          if (!slot) return;
          try {
            let assetId = slot.assetId;
            if (slot.file) {
              const asset = await assetService.uploadAsset(pid!, slot.file);
              assetId = asset.id;
              setSlots((prev) => {
                const next = [...prev];
                next[i] = { assetId: asset.id, url: asset.url };
                return next;
              });
            }
            if (assetId) {
              await colorworkService.bindFrame(pid!, i, assetId);
            }
          } catch {}
        })
      );

      return pid;
    },
    [projectId, selectedApiPalette, gridType, slots, router]
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
    const PADDING = tc.pad;
    const GRID_GAP = tc.gap;

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
  }, [gridType, slots, frameColorHex, tc]);

  // ── Complete / Render ────────────────────────────────────────────────────

  const handleComplete = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
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
      // 썸네일 업로드 (백그라운드, 실패해도 진행)
      buildCanvas().then((blob) => {
        if (blob && pid) {
          colorworkService.uploadThumbnail(pid, blob).catch(() => {});
        }
      });
      sessionStorage.removeItem("cw_session");
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
            <h2 className="text-xl font-black text-gray-900">떠나시겠어요?</h2>
            <p className="text-sm text-gray-500 font-medium mt-2">
              저장하지 않으면 여태까지 한 내용이 사라져요.
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
                sessionStorage.removeItem("cw_session");
                router.replace("/");
              }}
              className="flex-1 py-3 bg-black text-white rounded-2xl text-sm font-bold hover:bg-gray-800 transition-colors"
            >
              나가기
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
    "https://images.unsplash.com/photo-1518991669955-9c7e78ec80ca?w=300&q=80",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&q=80",
    "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=300&q=80",
    "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=300&q=80",
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
            <StatusBar theme="dark" />
            {/* 네비바: 어둡게 */}
            <div className="relative">
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
                <div className="mb-6 p-2 -ml-2 w-fit">
                  <ChevronLeft />
                </div>
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
            <StatusBar theme="dark" />
            {/* 네비바: 어둡게 */}
            <div className="relative">
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
                <div className="mb-6 p-2 -ml-2 w-fit">
                  <ChevronLeft />
                </div>
                <h1 className="text-3xl font-black mb-2">
                  몇 장의 사진을
                  <br />
                  담을까요?
                </h1>
                <p className="text-gray-500">원하는 레이아웃을 선택해주세요.</p>
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
                              {cfg.previewCells.map((area) => (
                                <div
                                  key={area}
                                  className={`rounded-[2px] ${
                                    isSel ? "bg-gray-400" : "bg-gray-200"
                                  }`}
                                  style={{ gridArea: area }}
                                />
                              ))}
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
            <StatusBar theme="dark" />
            {/* 헤더: 어둡게 (임시저장 없음) */}
            <div className="relative">
              <div className="px-4 py-3 flex justify-between items-center border-b border-gray-100">
                <div className="flex items-center gap-1">
                  <div className="p-2 -ml-2">
                    <ChevronLeft />
                  </div>
                  <div className="p-2">
                    <Menu size={22} />
                  </div>
                </div>
                <span className="font-bold">3 / 4 채움</span>
                <div className="w-16" />
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
                className={`relative z-20 w-4/5 shadow-2xl overflow-hidden ${G_TC.rounded}`}
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
                          ? "bg-gray-800 opacity-50"
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
              {/* 색상·굵기 컨트롤: 스포트라이트 + 툴팁 */}
              <div className="relative z-20 mt-4 flex flex-col items-center gap-3">
                <div className="flex items-center gap-3">
                  {[
                    { bg: "#FFFFFF", border: true },
                    { bg: "#000000" },
                    { bg: "#E8553A", border: true },
                  ].map(({ bg, border }, i) => (
                    <div
                      key={i}
                      className={`w-7 h-7 rounded-full ${
                        i === 0
                          ? "ring-2 ring-offset-2 ring-gray-800 scale-110"
                          : "opacity-60"
                      } ${border ? "border border-gray-300" : ""}`}
                      style={{ backgroundColor: bg }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className={`p-1.5 rounded-xl border-2 ${
                        i === 1
                          ? "border-gray-800 bg-gray-100"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {i === 0 ? (
                        <div className="w-8 h-8 bg-gray-200 flex items-center justify-center rounded-sm relative">
                          <div className="w-5 h-0.5 bg-gray-500 rounded-full rotate-45 absolute" />
                          <div className="w-5 h-0.5 bg-gray-500 rounded-full -rotate-45 absolute" />
                        </div>
                      ) : (
                        <div
                          className="w-8 h-8 bg-gray-200 flex items-center justify-center rounded-sm overflow-hidden"
                          style={{ padding: i * 2 }}
                        >
                          <div
                            className="w-full h-full grid grid-cols-2 grid-rows-2"
                            style={{ gap: i }}
                          >
                            {[0, 1, 2, 3].map((j) => (
                              <div
                                key={j}
                                className="bg-gray-500 rounded-[1px]"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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
                  className={`${G_TC.rounded} shadow-2xl mb-4 w-full max-w-[320px] relative overflow-hidden ring-4 ring-white/20`}
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
          <button
            onClick={() => setShowLeaveConfirm(true)}
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
          <button
            onClick={() => setStep(1)}
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
                        {cfg.previewCells.map((area) => (
                          <div
                            key={area}
                            className={`rounded-[2px] ${
                              isSelected ? "bg-gray-400" : "bg-gray-200"
                            }`}
                            style={{ gridArea: area }}
                          />
                        ))}
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
          <button
            onClick={async () => {
              if (!isLoggedIn) {
                setShowLoginRequired(true);
                return;
              }
              let pid = projectId;
              if (!pid) {
                setIsCreating(true);
                pid = await createAndSaveProject();
                setIsCreating(false);
                if (!pid) return;
              }
              await projectService.updateTitle(
                pid,
                "진행중인 템플릿을 확인해주세요"
              );
              queryClient.invalidateQueries({ queryKey: ["projects"] });
              router.replace("/inprogress");
            }}
            className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
          >
            임시저장
          </button>
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
              aspectRatio: gridType
                ? LAYOUT_CONFIG[gridType].containerStyle.aspectRatio
                : undefined,
              backgroundColor: frameColorHex,
            }}
          >
            {/* 내부 그리드: absolute로 컨테이너를 꽉 채움 → 이미지 삽입해도 칸 크기 불변 */}
            <div
              className="absolute inset-0 grid"
              style={
                gridType
                  ? {
                      gridTemplateAreas:
                        LAYOUT_CONFIG[gridType].containerStyle
                          .gridTemplateAreas,
                      gridTemplateColumns:
                        LAYOUT_CONFIG[gridType].containerStyle
                          .gridTemplateColumns,
                      gridTemplateRows:
                        LAYOUT_CONFIG[gridType].containerStyle.gridTemplateRows,
                      gap: `${tc.gap}px`,
                      padding: `${tc.pad}px`,
                    }
                  : undefined
              }
            >
              {slots.map((slot, i) => (
                <div
                  key={i}
                  onClick={() => uploadingIndex === null && handleSlotClick(i)}
                  className={`relative overflow-hidden cursor-pointer transition-all active:scale-95 ${
                    slot ? "bg-gray-800" : "bg-gray-100 hover:bg-gray-200"
                  } flex items-center justify-center min-h-0 min-w-0`}
                  style={
                    gridType
                      ? { gridArea: LAYOUT_CONFIG[gridType].areas[i] }
                      : undefined
                  }
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
          </div>

          {/* 테두리 색상 + 두께 선택 */}
          <div className="mt-4 flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              {(
                [
                  { key: "white" as const, bg: "#FFFFFF", border: true },
                  { key: "black" as const, bg: "#000000" },
                  {
                    key: "palette" as const,
                    bg:
                      selectedApiPalette?.colors[
                        Math.floor((selectedApiPalette?.colors.length ?? 0) / 2)
                      ]?.hex ?? "#e0e0e0",
                    border: true,
                  },
                ] as {
                  key: "white" | "black" | "palette";
                  bg: string;
                  border?: boolean;
                }[]
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
                    <div
                      className="w-8 h-8 bg-gray-200 flex items-center justify-center rounded-sm overflow-hidden"
                      style={{ padding: p }}
                    >
                      <div
                        className="w-full h-full grid grid-cols-2 grid-rows-2"
                        style={{ gap: g }}
                      >
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
            {isSubmitting ? "렌더링 중..." : "완성하기"}
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
                        {
                          countLabel: "4장",
                          variants: ["G2", "G2_GRID"] as const,
                        },
                        {
                          countLabel: "6장",
                          variants: ["G6", "G6_GRID"] as const,
                        },
                        {
                          countLabel: "9장",
                          variants: ["G3", "G3_GRID"] as const,
                        },
                      ] as const
                    ).map(({ countLabel, variants }) => (
                      <div key={countLabel}>
                        <p className="text-xs font-bold text-gray-400 mb-2">
                          {countLabel}
                        </p>
                        <div className="flex gap-2">
                          {variants.map((type) => {
                            const cfg = LAYOUT_CONFIG[type];
                            const isSelected = gridType === type;
                            return (
                              <button
                                key={type}
                                onClick={() => {
                                  handleGridSelect(type);
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
                                    gridTemplateColumns:
                                      cfg.containerStyle.gridTemplateColumns,
                                    gridTemplateRows:
                                      cfg.containerStyle.gridTemplateRows,
                                    width: cfg.previewSize.width,
                                    height: cfg.previewSize.height,
                                  }}
                                >
                                  {cfg.previewCells.map((area) => (
                                    <div
                                      key={area}
                                      className={`rounded-[2px] ${
                                        isSelected
                                          ? "bg-gray-400"
                                          : "bg-gray-200"
                                      }`}
                                      style={{ gridArea: area }}
                                    />
                                  ))}
                                </div>
                                <span
                                  className={`text-xs font-bold ${
                                    isSelected
                                      ? "text-gray-900"
                                      : "text-gray-400"
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
                </>
              )}
            </div>
          </div>
        )}

        {showLoginRequired && (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
            onClick={() => setShowLoginRequired(false)}
          >
            <div
              className="bg-white w-full rounded-3xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center text-center mb-6">
                <h2 className="text-xl font-black text-gray-900">
                  로그인이 필요해요
                </h2>
                <p className="text-sm text-gray-500 font-medium mt-2">
                  임시저장은 로그인 후 이용할 수 있어요.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLoginRequired(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-2xl text-sm font-bold hover:bg-gray-200 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={() => router.push("/login")}
                  className="flex-1 py-3 bg-black text-white rounded-2xl text-sm font-bold hover:bg-gray-800 transition-colors"
                >
                  로그인하기
                </button>
              </div>
            </div>
          </div>
        )}

        {renderLeaveModal()}
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
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `colorwork_${projectId ?? Date.now()}.png`;
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
            <button
              onClick={() => setStep(3)}
              className="p-2 -ml-2 rounded-full hover:bg-white/20 transition-colors"
            >
              <ChevronLeft />
            </button>
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
                gridTemplateColumns:
                  layoutCfg?.containerStyle.gridTemplateColumns,
                gridTemplateRows: layoutCfg?.containerStyle.gridTemplateRows,
                gap: `${tc.gap}px`,
                padding: `${tc.pad}px`,
              }}
            >
              {slots.map((slot, i) => (
                <div
                  key={i}
                  className="relative min-h-0 min-w-0 bg-gray-200 overflow-hidden"
                  style={{
                    gridArea: layoutCfg
                      ? LAYOUT_CONFIG[gridType!].areas[i]
                      : undefined,
                  }}
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
              className="flex-1 flex items-center justify-center gap-2 py-4 bg-white text-black font-medium rounded-xl shadow-xl hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-50 text-base"
            >
              {isDownloading ? (
                <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
              ) : (
                <Download size={18} />
              )}
              다운로드
            </button>
            <button
              onClick={handleShare}
              disabled={isDownloading}
              className="flex-1 flex items-center justify-center gap-2 py-4 bg-white text-black font-medium rounded-xl shadow-xl hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-50 text-base"
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

export default ColorWorkFlow;
