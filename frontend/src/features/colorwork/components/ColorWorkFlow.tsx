"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Palette,
  Camera,
  Share2,
  RefreshCcw,
  Download,
} from "lucide-react";
import StatusBar from "@/components/ui/StatusBar";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";
import ColorBlockSelector from "./ColorBlockSelector";
import { colorworkService } from "@/lib/api/colorworkService";
import { assetService } from "@/lib/api/assetService";
import { renderService } from "@/lib/api/renderService";
import { projectService } from "@/lib/api/projectService";
import {
  ColorPalette as ApiColorPalette,
  RenderJobResponse,
} from "@/lib/api/types";

// ─── Local types ───────────────────────────────────────────────────────────

interface UploadSlot {
  assetId?: number;
  url?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────

const ColorWorkFlow = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const projectIdParam = searchParams.get("projectId");
  const projectIdFromUrl = projectIdParam ? parseInt(projectIdParam, 10) : null;
  const isReentry = projectIdFromUrl !== null;

  // ── mode & step ──
  const [mode, setMode] = useState<"guide" | "actual" | null>(null);
  const [step, setStep] = useState(0);

  // ── project ──
  const [projectId, setProjectId] = useState<number | null>(projectIdFromUrl);
  const [isCreating, setIsCreating] = useState(false);

  // ── palette (API) ──
  const [apiPalettes, setApiPalettes] = useState<ApiColorPalette[]>([]);
  const [selectedApiPalette, setSelectedApiPalette] =
    useState<ApiColorPalette | null>(null);
  const [isPalettesLoading, setIsPalettesLoading] = useState(false);

  // ── grid ──
  const [gridType, setGridType] = useState<"G2" | "G6" | "G3" | null>(null);

  // ── slots ──
  const [slots, setSlots] = useState<(UploadSlot | null)[]>([]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  // ── render ──
  const [renderJob, setRenderJob] = useState<RenderJobResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── guide (demo only) ──
  const [guideFilledSlots, setGuideFilledSlots] = useState(
    Array(9).fill(false)
  );

  // ── frame modal ──
  const [frameModalStep, setFrameModalStep] = useState<
    "closed" | "confirm" | "select"
  >("closed");

  // ── file upload ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingSlotIndex = useRef<number>(-1);

  // ── Initialize ──────────────────────────────────────────────────────────

  const fetchPalettes = useCallback(async (pid: number) => {
    setIsPalettesLoading(true);
    try {
      const res = await colorworkService.shufflePalette(pid);
      setApiPalettes(res?.palettes ?? []);
    } finally {
      setIsPalettesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (projectIdFromUrl) {
      // Re-entry: restore state from API
      colorworkService
        .getState(projectIdFromUrl)
        .then((state) => {
          setProjectId(state.projectId);
          setMode("actual");

          // Restore palette if already selected
          if (state.selectedPaletteSeed && state.selectedColors) {
            setSelectedApiPalette({
              seed: state.selectedPaletteSeed,
              colors: state.selectedColors,
            });
          }

          // Restore grid
          if (state.gridType) {
            setGridType(state.gridType as "G2" | "G6" | "G3");
            const slotCount =
              state.gridType === "G2" ? 4 : state.gridType === "G6" ? 6 : 9;
            const restored: (UploadSlot | null)[] = Array(slotCount).fill(null);
            state.frames.forEach((f) => {
              if (f && f.index < slotCount) {
                restored[f.index] = { assetId: f.assetId, url: f.assetUrl };
              }
            });
            setSlots(restored);
          }

          // Determine step
          if (state.step === "FRAME" || state.step === "DONE") {
            // Check if a render job already exists for this project
            renderService
              .getLatestJobByProject(state.projectId)
              .then((job) => {
                setRenderJob(job);
                if (job.status === "SUCCEEDED" || job.status === "RUNNING" || job.status === "QUEUED") {
                  setStep(4);
                  if (job.status === "RUNNING" || job.status === "QUEUED") {
                    pollRenderJob(job.id);
                  }
                } else {
                  setStep(3);
                }
              })
              .catch(() => {
                setStep(3);
              });
          } else if (state.step === "GRID") {
            setStep(3);
          } else if (state.step === "PALETTE") {
            fetchPalettes(state.projectId);
            setStep(1);
          } else {
            fetchPalettes(state.projectId);
            setStep(1);
          }
        })
        .catch(() => {
          setMode("guide");
        });
    } else {
      setMode("guide");
      setStep(0);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Guide helpers ────────────────────────────────────────────────────────

  const startProject = useCallback(async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const project = await colorworkService.createProject();
      const pid = project.id;
      setProjectId(pid);
      await colorworkService.markHowtoSeen(pid);
      await fetchPalettes(pid);
      router.replace(`/colorwork?projectId=${pid}`);
      setMode("actual");
      setStep(1);
    } finally {
      setIsCreating(false);
    }
  }, [isCreating, fetchPalettes, router]);

  // ── Palette ──────────────────────────────────────────────────────────────

  const handleRefreshPalettes = async () => {
    if (!projectId) return;
    await fetchPalettes(projectId);
    setSelectedApiPalette(null);
  };

  const handleSelectPalette = async (palette: ApiColorPalette) => {
    setSelectedApiPalette(palette);
    if (!projectId) return;
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
    if (!projectId) return;
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

    // 즉시 로컬 미리보기 표시
    const localUrl = URL.createObjectURL(file);
    setSlots((prev) => {
      const next = [...prev];
      next[idx] = { url: localUrl };
      return next;
    });

    // 백엔드 업로드 (실패해도 미리보기는 유지)
    if (projectId) {
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
        // 업로드 실패해도 로컬 미리보기 유지
      } finally {
        setUploadingIndex(null);
      }
    }
  };

  // ── Complete / Render ────────────────────────────────────────────────────

  const handleComplete = async () => {
    if (!projectId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const job = await renderService.submitPersonal(projectId);
      setRenderJob(job);
      setStep(4);
      pollRenderJob(job.id);
    } catch {
      setIsSubmitting(false);
    }
  };

  const pollRenderJob = (jobId: number) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(async () => {
      try {
        const job = await renderService.getRenderJob(jobId);
        setRenderJob(job);
        if (job.status === "SUCCEEDED" || job.status === "FAILED") {
          clearInterval(pollIntervalRef.current!);
          pollIntervalRef.current = null;
          setIsSubmitting(false);
        }
      } catch {
        // 폴링 실패 시 중단하고 버튼 복구
        clearInterval(pollIntervalRef.current!);
        pollIntervalRef.current = null;
        setIsSubmitting(false);
      }
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // ── Pre-fetch share URL when render succeeds ─────────────────────────────
  useEffect(() => {
    if (renderJob?.status === "SUCCEEDED" && !shareUrl) {
      renderService
        .getShareUrl(renderJob.id)
        .then((url) => setShareUrl(url))
        .catch(() => {}); // 실패해도 버튼은 활성화 유지
    }
  }, [renderJob?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Overlay helpers ──────────────────────────────────────────────────────

  const renderOverlay = () => (
    <div className="absolute inset-0 bg-gray-900/40 z-40 pointer-events-none" />
  );
  const renderTooltip = (
    text: string,
    positionClass: string,
    hideArrow = false
  ) => (
    <div className={`absolute ${positionClass} z-50 w-max max-w-[280px]`}>
      <div className="bg-white text-black px-4 py-2.5 rounded-xl font-bold text-sm shadow-xl relative text-center break-keep leading-snug whitespace-pre-wrap">
        {text}
        {!hideArrow && (
          <div className="w-3 h-3 bg-white rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
        )}
      </div>
    </div>
  );

  // ── Guard ────────────────────────────────────────────────────────────────

  if (mode === null) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400 text-sm">
        불러오는 중...
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // GUIDE FLOW
  // ════════════════════════════════════════════════════════════════════════

  if (mode === "guide") {
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

    if (step === 1) {
      return (
        <div className="flex flex-col h-full bg-white relative pb-safe overflow-hidden animate-fade-in">
          <StatusBar theme="light" />
          {renderOverlay()}
          <div className="absolute top-12 right-6 z-50">
            <button
              onClick={startProject}
              disabled={isCreating}
              className="text-xs font-bold text-white/70 hover:text-white underline underline-offset-4 disabled:opacity-50"
            >
              {isCreating ? "준비 중..." : "건너뛰기"}
            </button>
          </div>
          <div className="px-6 pt-12 pb-2 opacity-30 relative z-30">
            <h1 className="text-3xl font-black leading-tight text-gray-900 mb-2 tracking-tight">
              오늘 당신의
              <br />
              무드는 어떤가요?
            </h1>
          </div>
          <div className="flex-1 px-6 flex flex-col justify-center relative py-6">
            <div className="grid grid-cols-3 gap-4 relative">
              <div className="relative z-50 pointer-events-none">
                {renderTooltip(
                  "색상 하나를 선택해 주세요.",
                  "-top-16 absolute left-0 whitespace-nowrap"
                )}
                <ColorBlockSelector
                  color={{ name: "Ocean", bg: "bg-blue-500" }}
                  isSelected={true}
                  onClick={() => {}}
                />
              </div>
              <div className="opacity-20 pointer-events-none">
                <ColorBlockSelector
                  color={{ name: "Sunset", bg: "bg-orange-500" }}
                  isSelected={false}
                  onClick={() => {}}
                />
              </div>
              <div className="opacity-20 pointer-events-none">
                <ColorBlockSelector
                  color={{ name: "Forest", bg: "bg-emerald-500" }}
                  isSelected={false}
                  onClick={() => {}}
                />
              </div>
            </div>
          </div>
          <div className="p-6 safe-area-bottom w-full flex justify-between items-center relative z-50 mt-auto">
            <button
              onClick={() => setStep(0)}
              className="px-4 py-2 rounded-xl text-white/80 font-bold text-sm hover:bg-white/10 hover:text-white transition-colors"
            >
              이전
            </button>
            <button
              onClick={() => setStep(2)}
              className="px-6 py-2.5 rounded-xl bg-white text-black font-bold text-sm shadow-lg hover:bg-gray-100 transition-colors"
            >
              다음
            </button>
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="flex flex-col h-full bg-white relative pb-safe overflow-hidden animate-fade-in">
          <StatusBar theme="light" />
          {renderOverlay()}
          <div className="absolute top-12 right-6 z-50">
            <button
              onClick={startProject}
              disabled={isCreating}
              className="text-xs font-bold text-white/70 hover:text-white underline underline-offset-4 disabled:opacity-50"
            >
              {isCreating ? "준비 중..." : "건너뛰기"}
            </button>
          </div>
          <div className="px-6 pt-12 pb-2 opacity-30 relative z-30">
            <h1 className="text-3xl font-black mb-2 text-gray-900">
              몇 장의 사진을
              <br />
              담을까요?
            </h1>
          </div>
          <div className="flex-1 px-6 flex flex-col items-center justify-center relative py-6">
            <div className="relative z-50 w-full max-w-[300px] flex flex-col items-center">
              {renderTooltip(
                "선택한 색상을 가진 이미지를\n2x2 또는 3x3 을 골라 업로드 합니다.",
                "-top-20 absolute left-1/2 -translate-x-1/2 w-[260px]"
              )}
              <div className="w-full aspect-square bg-white p-2 rounded-2xl shadow-2xl grid grid-cols-3 gap-2 mt-4">
                {guideFilledSlots.map((filled, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      const next = [...guideFilledSlots];
                      next[i] = true;
                      setGuideFilledSlots(next);
                    }}
                    className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all active:scale-95 ${
                      filled ? "bg-gray-800" : "bg-gray-100 hover:bg-gray-200"
                    } flex items-center justify-center`}
                  >
                    {filled ? (
                      <img
                        src={`https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=200&sig=${i}`}
                        className="w-full h-full object-cover opacity-80"
                        alt="guide"
                      />
                    ) : (
                      <Camera className="text-gray-400" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="p-6 safe-area-bottom w-full flex justify-between items-center relative z-50 mt-auto">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-xl text-white/80 font-bold text-sm hover:bg-white/10 hover:text-white transition-colors"
            >
              이전
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-6 py-2.5 rounded-xl bg-white text-black font-bold text-sm shadow-lg hover:bg-gray-100 transition-colors"
            >
              다음
            </button>
          </div>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="flex flex-col h-full bg-blue-100 relative pb-safe overflow-hidden animate-fade-in">
          <StatusBar theme="light" />
          {renderOverlay()}
          <div className="absolute top-12 right-6 z-50">
            <button
              onClick={startProject}
              disabled={isCreating}
              className="text-xs font-bold text-white/70 hover:text-white underline underline-offset-4 disabled:opacity-50"
            >
              {isCreating ? "준비 중..." : "건너뛰기"}
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center relative py-6 px-6">
            <div className="relative z-50 w-full flex flex-col items-center">
              <div className="w-full max-w-[280px] bg-white p-5 rounded-xl shadow-2xl transform scale-105 relative ring-4 ring-white/20 flex flex-col">
                <div className="w-full aspect-square grid grid-cols-3 grid-rows-3 gap-1">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="bg-gray-300 relative aspect-square">
                      <img
                        src={`https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=200&sig=${i}`}
                        className="w-full h-full object-cover"
                        alt="guide result"
                      />
                      <div className="absolute inset-0 bg-blue-500 mix-blend-color opacity-40" />
                    </div>
                  ))}
                </div>
              </div>
              {renderTooltip(
                "결과가 완성됩니다.",
                "top-full mt-12 absolute left-1/2 -translate-x-1/2 whitespace-nowrap",
                true
              )}
            </div>
          </div>
          <div className="p-6 safe-area-bottom w-full flex flex-col gap-3 relative z-50 mt-auto">
            <Button
              size="lg"
              variant="white"
              onClick={startProject}
              disabled={isCreating}
            >
              {isCreating ? "준비 중..." : "이용해보기"}
            </Button>
            <Button size="lg" variant="white" onClick={() => router.back()}>
              홈으로 돌아가기
            </Button>
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
        <div className="px-6 pt-12 pb-2">
          <button
            onClick={() => isReentry ? router.replace("/inprogress") : router.back()}
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

  // Step 2: Grid selection
  if (step === 2) {
    return (
      <div className="flex flex-col h-full bg-white animate-slide-left relative">
        <StatusBar theme="dark" />
        <div className="px-6 pt-12 pb-6">
          <button
            onClick={() => isReentry ? router.replace("/inprogress") : setStep(1)}
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
          <button
            onClick={() =>
              isReentry ? router.replace("/inprogress") : setStep(2)
            }
            className="p-2 -ml-2 rounded-full hover:bg-gray-100"
          >
            <ChevronLeft />
          </button>
          <span className="font-bold">
            {filledCount} / {totalSlots} 채움
          </span>
          <button
            onClick={async () => {
              if (projectId) {
                await projectService.updateTitle(
                  projectId,
                  "진행중인 템플릿을 확인해주세요"
                );
              }
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
            {isReentry && (
              <button
                onClick={() => setFrameModalStep("confirm")}
                className="text-xs font-bold text-gray-400 underline underline-offset-2 hover:text-gray-600 transition-colors shrink-0"
              >
                프레임 바꾸기
              </button>
            )}
          </div>
        </div>
        <div className="p-6 pb-safe safe-area-bottom bg-white border-t border-gray-100">
          <Button
            size="lg"
            disabled={!isComplete || isSubmitting || !projectId}
            onClick={handleComplete}
          >
            {isSubmitting
              ? "렌더링 중..."
              : !projectId
              ? "프로젝트 준비 중..."
              : "완성하기"}
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
                      {
                        type: "G2" as const,
                        count: 4,
                        cols: 2,
                        rows: 2,
                        label: "4장",
                      },
                      {
                        type: "G6" as const,
                        count: 6,
                        cols: 2,
                        rows: 3,
                        label: "6장",
                      },
                      {
                        type: "G3" as const,
                        count: 9,
                        cols: 3,
                        rows: 3,
                        label: "9장",
                      },
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

  // Step 4: Result
  if (step === 4) {
    const resultColor = selectedApiPalette?.colors[0]?.hex ?? "#6366f1";
    const isDone = renderJob?.status === "SUCCEEDED";
    const isFailed = renderJob?.status === "FAILED";
    const isRendering = !isDone && !isFailed;
    const gridClass =
      gridType === "G3"
        ? "grid-cols-3 grid-rows-3"
        : gridType === "G6"
        ? "grid-cols-2 grid-rows-3"
        : "grid-cols-2 grid-rows-2";
    const aspectClass = gridType === "G6" ? "aspect-[2/3]" : "aspect-square";

    return (
      <div
        className="flex flex-col h-full text-white animate-fade-in relative"
        style={{ backgroundColor: resultColor }}
      >
        {showCopiedToast && <Toast message="링크가 복사되었습니다" />}
        <StatusBar theme="light" />
        <div className="px-4 py-3 flex justify-between items-center relative z-50">
          <button
            onClick={() => setStep(3)}
            className="p-2 -ml-2 rounded-full hover:bg-white/20 transition-colors"
          >
            <ChevronLeft />
          </button>
          <span className="font-bold text-lg">ColorWork</span>
          <div className="w-10" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto no-scrollbar">
          {/* 결과 이미지: 항상 표시 */}
          <div
            className={`bg-white p-3 rounded-xl shadow-2xl mb-4 w-full max-w-[320px] flex flex-col relative overflow-hidden ring-4 ring-white/20 ${aspectClass}`}
          >
            {isDone && renderJob?.resultUrl ? (
              <img
                src={renderJob.resultUrl}
                alt="result"
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <div
                className={`w-full h-full grid gap-1 overflow-hidden ${gridClass}`}
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
            )}
            {/* 렌더링 중 오버레이 */}
            {isRendering && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-lg">
                <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          <p className="text-white/80 text-sm font-medium text-center drop-shadow-md">
            #ColorWork #{selectedApiPalette?.colors[0]?.name ?? "mood"} #
            {slots.length}cuts
          </p>

          {isRendering && (
            <p className="text-white/60 text-xs font-medium mt-2">
              최종 이미지를 생성 중입니다...
            </p>
          )}
          {isFailed && (
            <p className="text-white/70 text-xs font-medium mt-2">
              렌더링에 실패했습니다. 사진은 저장되어 있어요.
            </p>
          )}
        </div>

        <div className="p-6 pb-safe safe-area-bottom space-y-3 bg-gradient-to-t from-black/20 to-transparent">
          {isFailed && (
            <Button
              size="lg"
              variant="white"
              icon={RefreshCcw}
              loading={isSubmitting}
              onClick={async () => {
                if (!renderJob || isSubmitting) return;
                setIsSubmitting(true);
                try {
                  const newJob = await renderService.retryRenderJob(renderJob.id);
                  setRenderJob(newJob);
                  setShareUrl(null);
                  pollRenderJob(newJob.id);
                } catch {
                  setIsSubmitting(false);
                }
              }}
            >
              다시 시도
            </Button>
          )}
          {isDone && (
            <Button
              size="lg"
              variant="white"
              icon={Download}
              onClick={async () => {
                const url = await renderService.getDownloadUrl(renderJob.id);
                window.open(url, "_blank");
              }}
            >
              다운로드
            </Button>
          )}
          <Button
            size="lg"
            variant="white"
            icon={Share2}
            disabled={!isDone || !shareUrl}
            onClick={() => {
              if (!shareUrl) return;
              navigator.clipboard
                .writeText(shareUrl)
                .then(() => {
                  setShowCopiedToast(true);
                  setTimeout(() => setShowCopiedToast(false), 1500);
                })
                .catch(() => {
                  // clipboard API 미지원 시 fallback
                  const el = document.createElement("textarea");
                  el.value = shareUrl;
                  document.body.appendChild(el);
                  el.select();
                  document.execCommand("copy");
                  document.body.removeChild(el);
                  setShowCopiedToast(true);
                  setTimeout(() => setShowCopiedToast(false), 1500);
                });
            }}
          >
            공유하기
          </Button>
          <button
            onClick={() => router.replace("/")}
            className="w-full py-3 text-white text-sm font-bold opacity-80 hover:opacity-100"
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
