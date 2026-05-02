"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Download,
  Share2,
  Trash2,
  Film,
  Palette,
  Users,
  Play,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import StatusBar from "@/components/ui/StatusBar";
import { useUI } from "@/lib/context/UIContext";
import { useProjects } from "@/hooks/useProjects";
import { projectService } from "@/lib/api/projectService";
import { renderService } from "@/lib/api/renderService";
import { groupService } from "@/lib/api/groupService";
import { ProjectResponse } from "@/lib/api/types";
import { LAYOUT_CONFIG } from "@/features/colorwork/layoutConfig";

type ViewType = "templates" | "colorwork" | "colorwork-detail" | "dayshare" | "dayshare-detail";

// ─── 컬러워크 썸네일 ─────────────────────────────────────────────────────────

const ColorworkThumbnail = ({
  item,
  className = "",
  contain = false,
}: {
  item: ProjectResponse;
  className?: string;
  contain?: boolean;
}) => {
  if (item.thumbnailUrl) {
    return (
      <img
        src={item.thumbnailUrl}
        alt="colorwork"
        className={`${contain ? "max-w-full max-h-full object-contain" : "w-full h-full object-cover"} ${className}`}
      />
    );
  }
  if (item.frameUrls && item.frameUrls.length > 0 && item.gridType) {
    const cfg = LAYOUT_CONFIG[item.gridType as keyof typeof LAYOUT_CONFIG];
    if (cfg) {
      const aspectRatio = cfg.containerStyle.aspectRatio;
      return (
        <div
          className={`grid ${contain ? "" : "w-full h-full"} ${className}`}
          style={{
            gridTemplateAreas: cfg.containerStyle.gridTemplateAreas,
            gridTemplateColumns: cfg.containerStyle.gridTemplateColumns,
            gridTemplateRows: cfg.containerStyle.gridTemplateRows,
            gap: "1px",
            backgroundColor: item.paletteColor ?? "#e5e7eb",
            ...(contain ? { aspectRatio, maxWidth: "100%", maxHeight: "100%" } : {}),
          }}
        >
          {item.frameUrls.map((url, i) => (
            <div key={i} className="overflow-hidden min-h-0 min-w-0" style={{ gridArea: (cfg.areas as readonly string[])[i] }}>
              <img src={url} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      );
    }
  }
  return (
    <div className={`w-full h-full flex items-center justify-center ${className}`} style={{ backgroundColor: item.paletteColor ?? "#e5e7eb" }}>
      <div className="grid grid-cols-2 gap-0.5 w-8 h-8 opacity-40">
        {[0, 1, 2, 3].map((i) => <div key={i} className="rounded-sm bg-white" />)}
      </div>
    </div>
  );
};

// ─── 메인 ────────────────────────────────────────────────────────────────────

const RecentScreen = () => {
  const router = useRouter();
  const { openMenu } = useUI();
  const queryClient = useQueryClient();

  const [view, setView] = useState<ViewType>("templates");
  const [selectedItem, setSelectedItem] = useState<ProjectResponse | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [moreMenuTarget, setMoreMenuTarget] = useState<ProjectResponse | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProjectResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: allProjects = [], isLoading } = useProjects({ tab: "RECENT" });
  const colorworkItems = allProjects.filter((p) => p.templateType === "COLORWORK");
  const dayshareItems = allProjects.filter((p) => p.templateType === "DAYSHARE");

  const downloadBlob = async (url: string, fileName: string) => {
    const res = await fetch(url);
    const blob = await res.blob();
    const file = new File([blob], fileName, { type: blob.type });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] });
    } else {
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(objUrl);
    }
  };

  const handleColorworkDownload = async (item: ProjectResponse) => {
    if (isDownloading || !item.thumbnailUrl) return;
    setIsDownloading(true);
    setShowMoreMenu(false);
    try { await downloadBlob(item.thumbnailUrl, `colorwork_${item.id}.png`); }
    catch (e) { if (e instanceof Error && e.name === "AbortError") return; }
    finally { setIsDownloading(false); }
  };

  const handleColorworkShare = async (item: ProjectResponse) => {
    if (isDownloading || !item.thumbnailUrl) return;
    setIsDownloading(true);
    setShowMoreMenu(false);
    try {
      const res = await fetch(item.thumbnailUrl);
      const blob = await res.blob();
      const file = new File([blob], `colorwork_${item.id}.png`, { type: "image/png" });
      await navigator.share?.({ files: [file], title: "컬러워크" });
    } catch (e) { if (e instanceof Error && e.name === "AbortError") return; }
    finally { setIsDownloading(false); }
  };

  const handleDayshareDownload = async (item: ProjectResponse) => {
    if (isDownloading) return;
    setIsDownloading(true);
    setShowMoreMenu(false);
    try {
      const job = await renderService.getLatestJobByProject(item.id);
      if (job?.id) await downloadBlob(await renderService.getDownloadUrl(job.id), `dayshare_${item.id}.mp4`);
    } catch { } finally { setIsDownloading(false); }
  };

  const handleDayshareShare = async (item: ProjectResponse) => {
    if (isDownloading) return;
    setIsDownloading(true);
    setShowMoreMenu(false);
    try {
      const job = await renderService.getLatestJobByProject(item.id);
      if (job?.id) await navigator.share?.({ url: await renderService.getShareUrl(job.id), title: "하루공유" });
    } catch { } finally { setIsDownloading(false); }
  };

  const handleDelete = async () => {
    if (!pendingDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await projectService.deleteProject(pendingDelete.id);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      if (view === "colorwork-detail") { setSelectedItem(null); setView("colorwork"); }
    } finally { setIsDeleting(false); setPendingDelete(null); }
  };

  const openMore = (item: ProjectResponse) => { setMoreMenuTarget(item); setShowMoreMenu(true); };
  const closeMore = () => { setShowMoreMenu(false); setMoreMenuTarget(null); };

  // ── 스와이프 ─────────────────────────────────────────────────────────────
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    const item = colorworkItems[index];
    if (item && item.id !== selectedItem?.id) setSelectedItem(item);
  }, [colorworkItems, selectedItem]);

  const scrollToItem = useCallback((item: ProjectResponse) => {
    const index = colorworkItems.findIndex((p) => p.id === item.id);
    if (index < 0) return;
    scrollContainerRef.current?.scrollTo({
      left: index * (scrollContainerRef.current.clientWidth),
      behavior: "smooth",
    });
    setSelectedItem(item);
  }, [colorworkItems]);

  // 상세 뷰 진입 시 선택된 아이템 위치로 즉시 스크롤
  useEffect(() => {
    if (view !== "colorwork-detail" || !selectedItem) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    const index = colorworkItems.findIndex((p) => p.id === selectedItem.id);
    if (index >= 0) el.scrollTo({ left: index * el.clientWidth, behavior: "instant" as ScrollBehavior });
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  // ════════════════════════════════════════════════════════════════════════
  // 1. 템플릿 선택
  // ════════════════════════════════════════════════════════════════════════
  if (view === "templates") {
    return (
      <div className="flex flex-col h-full bg-white pb-safe overflow-hidden">
        <StatusBar theme="dark" />
        <div className="px-4 pt-4 pb-4">
          <div className="flex items-center gap-3">
            <button onClick={openMenu} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
              <Menu size={24} />
            </button>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">보관함</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 space-y-4 pb-8">
          {isLoading ? (
            <>
              <div className="h-28 bg-gray-100 rounded-3xl animate-pulse" />
              <div className="h-28 bg-gray-100 rounded-3xl animate-pulse" />
            </>
          ) : (
            <>
              <button onClick={() => setView("colorwork")}
                className="w-full flex items-center gap-4 p-5 border border-gray-100 rounded-3xl hover:bg-gray-50 active:scale-[0.98] transition-all text-left shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center shrink-0 shadow-md shadow-orange-100">
                  <Palette className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-400 mb-0.5">개인 템플릿</p>
                  <h2 className="text-lg font-black text-gray-900">컬러워크</h2>
                  <p className="text-sm text-gray-400 font-medium mt-0.5">{colorworkItems.length}개의 작품</p>
                </div>
                <ChevronLeft className="w-5 h-5 text-gray-300 rotate-180 shrink-0" />
              </button>

              <button onClick={() => setView("dayshare")}
                className="w-full flex items-center gap-4 p-5 border border-gray-100 rounded-3xl hover:bg-gray-50 active:scale-[0.98] transition-all text-left shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-300 flex items-center justify-center shrink-0 shadow-md shadow-blue-100">
                  <Film className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-400 mb-0.5">그룹 템플릿</p>
                  <h2 className="text-lg font-black text-gray-900">하루공유</h2>
                  <p className="text-sm text-gray-400 font-medium mt-0.5">{dayshareItems.length}개의 기록</p>
                </div>
                <ChevronLeft className="w-5 h-5 text-gray-300 rotate-180 shrink-0" />
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // 2. 컬러워크 그리드 (사진첩 스타일)
  // ════════════════════════════════════════════════════════════════════════
  if (view === "colorwork") {
    return (
      <div className="flex flex-col h-full bg-white pb-safe overflow-hidden">
        <StatusBar theme="dark" />
        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <button onClick={() => setView("templates")} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-xl font-black tracking-tight text-gray-900">컬러워크</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {isLoading ? (
            <div className="grid grid-cols-3 gap-0.5">
              {Array(9).fill(0).map((_, i) => <div key={i} className="aspect-square bg-gray-100 animate-pulse" />)}
            </div>
          ) : colorworkItems.length > 0 ? (
            <div className="grid grid-cols-3 gap-0.5">
              {colorworkItems.map((item) => (
                <button key={item.id}
                  onClick={() => { setSelectedItem(item); setView("colorwork-detail"); }}
                  className="aspect-square overflow-hidden relative active:opacity-80 transition-opacity">
                  <ColorworkThumbnail item={item} className="absolute inset-0" />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <Palette size={24} className="opacity-20" />
              </div>
              <p className="text-sm font-medium">저장된 컬러워크가 없어요</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // 3. 컬러워크 상세 (전체화면, 검정 배경)
  // ════════════════════════════════════════════════════════════════════════
  if (view === "colorwork-detail" && selectedItem) {
    return (
      <div className="flex flex-col h-full bg-black relative overflow-hidden">
        <StatusBar theme="light" />

        {/* 헤더 */}
        <div className="absolute top-0 inset-x-0 z-20 px-2 pt-12 pb-6 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
          <button onClick={() => { setView("colorwork"); closeMore(); }}
            className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          {/* 날짜 pill */}
          <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center bg-black/30 backdrop-blur-sm px-4 py-1.5 rounded-full">
            <span className="text-white text-xs font-bold leading-tight">
              {new Date(selectedItem.updatedAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
            </span>
          </div>
          <button onClick={() => { setMoreMenuTarget(selectedItem); setShowMoreMenu((v) => !v); }}
            className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <MoreHorizontal className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* ... 드롭다운 */}
        {showMoreMenu && (
          <>
            <div className="absolute inset-0 z-30" onClick={closeMore} />
            <div className="absolute top-20 right-4 z-40 bg-white rounded-2xl shadow-2xl overflow-hidden min-w-[160px]">
              <button onClick={() => handleColorworkDownload(selectedItem)} disabled={isDownloading}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 text-sm font-medium text-gray-900 disabled:opacity-50">
                <Download size={16} className="text-gray-500" />다운로드
              </button>
              <div className="h-px bg-gray-100" />
              <button onClick={() => handleColorworkShare(selectedItem)} disabled={isDownloading}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 text-sm font-medium text-gray-900 disabled:opacity-50">
                <Share2 size={16} className="text-gray-500" />공유하기
              </button>
            </div>
          </>
        )}

        {/* 이미지 + 데스크탑 화살표 */}
        <div className="flex-1 flex items-stretch relative">
          {/* 왼쪽 화살표 (데스크탑만) */}
          {(() => {
            const currentIndex = colorworkItems.findIndex((p) => p.id === selectedItem?.id);
            return currentIndex > 0 ? (
              <button
                onClick={() => scrollToItem(colorworkItems[currentIndex - 1])}
                className="hidden md:flex items-center justify-center w-14 shrink-0 z-10 hover:bg-white/10 transition-colors"
              >
                <ChevronLeft className="w-8 h-8 text-white/70" />
              </button>
            ) : (
              <div className="hidden md:block w-14 shrink-0" />
            );
          })()}

          {/* 가로 스와이프 이미지 컨테이너 */}
          <div
            ref={scrollContainerRef}
            className="flex-1 flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
            onScroll={handleScroll}
          >
            {colorworkItems.map((item) => (
              <div key={item.id} className="w-full shrink-0 flex items-center justify-center snap-center">
                <ColorworkThumbnail item={item} contain />
              </div>
            ))}
          </div>

          {/* 오른쪽 화살표 (데스크탑만) */}
          {(() => {
            const currentIndex = colorworkItems.findIndex((p) => p.id === selectedItem?.id);
            return currentIndex < colorworkItems.length - 1 ? (
              <button
                onClick={() => scrollToItem(colorworkItems[currentIndex + 1])}
                className="hidden md:flex items-center justify-center w-14 shrink-0 z-10 hover:bg-white/10 transition-colors"
              >
                <ChevronRight className="w-8 h-8 text-white/70" />
              </button>
            ) : (
              <div className="hidden md:block w-14 shrink-0" />
            );
          })()}
        </div>

        {/* 하단 */}
        <div className="absolute bottom-0 inset-x-0 z-20 pb-safe bg-gradient-to-t from-black/60 to-transparent pt-10">
          {/* 썸네일 스트립 */}
          {colorworkItems.length > 1 && (
            <div className="flex gap-1.5 px-4 mb-4 overflow-x-auto no-scrollbar">
              {colorworkItems.map((item) => (
                <button key={item.id} onClick={() => scrollToItem(item)}
                  className={`shrink-0 w-12 h-12 rounded-lg overflow-hidden transition-all ${
                    item.id === selectedItem.id ? "ring-2 ring-white" : "opacity-50 hover:opacity-75"
                  }`}>
                  <ColorworkThumbnail item={item} className="w-full h-full" />
                </button>
              ))}
            </div>
          )}
          {/* 삭제 버튼 (우하단) */}
          <div className="flex justify-end px-4 pb-5">
            <button onClick={() => setPendingDelete(selectedItem)}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
              <Trash2 className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* 삭제 확인 */}
        {pendingDelete && (
          <div className="absolute inset-0 z-50 flex items-end bg-black/60" onClick={() => !isDeleting && setPendingDelete(null)}>
            <div className="bg-white w-full rounded-t-3xl p-6 pb-safe" onClick={(e) => e.stopPropagation()}>
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
                  <Trash2 size={22} className="text-red-400" />
                </div>
                <h2 className="text-xl font-black text-gray-900">삭제할까요?</h2>
                <p className="text-sm text-gray-500 font-medium mt-2">삭제하면 되돌릴 수 없어요.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setPendingDelete(null)} disabled={isDeleting}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-2xl text-sm font-bold">취소</button>
                <button onClick={handleDelete} disabled={isDeleting}
                  className="flex-1 py-3 bg-red-500 text-white rounded-2xl text-sm font-bold disabled:opacity-50">
                  {isDeleting ? "삭제 중..." : "삭제"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // 4. 하루공유 리스트
  // ════════════════════════════════════════════════════════════════════════
  if (view === "dayshare") {
    return (
      <div className="flex flex-col h-full bg-white pb-safe overflow-hidden relative">
        <StatusBar theme="dark" />
        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <button onClick={() => setView("templates")} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-xl font-black tracking-tight text-gray-900">하루공유</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {Array(3).fill(0).map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : dayshareItems.length > 0 ? (
            <div className="p-4 space-y-3">
              {dayshareItems.map((item) => (
                <div key={item.id}
                  onClick={() => { setSelectedItem(item); setView("dayshare-detail"); }}
                  className="flex gap-4 p-4 border border-gray-100 rounded-2xl hover:bg-gray-50 active:scale-[0.98] transition-all cursor-pointer">
                  <div className="w-16 h-16 rounded-xl shrink-0 overflow-hidden shadow-sm shadow-blue-100">
                    {item.thumbnailUrl ? (
                      <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-400 to-cyan-300 flex flex-col items-center justify-center gap-1">
                        <Play className="w-5 h-5 text-white fill-white" />
                        <span className="text-[7px] font-black text-white tracking-tight">DAY SHARE</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="font-bold text-gray-900 truncate">{item.title}</h3>
                    {item.memberCount != null && (
                      <div className="flex items-center gap-1 text-xs text-gray-400 font-medium mt-0.5">
                        <Users size={11} />
                        <span>{item.memberCount}명 참여</span>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(item.updatedAt).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); openMore(item); }}
                    className="p-2 self-center rounded-full hover:bg-gray-100 transition-colors shrink-0">
                    <MoreHorizontal size={18} className="text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <Film size={24} className="opacity-20" />
              </div>
              <p className="text-sm font-medium">저장된 하루공유가 없어요</p>
            </div>
          )}
        </div>

        {/* ... 드롭다운 */}
        {showMoreMenu && moreMenuTarget && (
          <>
            <div className="absolute inset-0 z-30" onClick={closeMore} />
            <div className="absolute bottom-24 right-6 z-40 bg-white rounded-2xl shadow-2xl overflow-hidden min-w-[160px]">
              <button onClick={() => handleDayshareDownload(moreMenuTarget)} disabled={isDownloading}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 text-sm font-medium text-gray-900 disabled:opacity-50">
                <Download size={16} className="text-gray-500" />다운로드
              </button>
              <div className="h-px bg-gray-100" />
              <button onClick={() => handleDayshareShare(moreMenuTarget)} disabled={isDownloading}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 text-sm font-medium text-gray-900 disabled:opacity-50">
                <Share2 size={16} className="text-gray-500" />공유하기
              </button>
              <div className="h-px bg-gray-100" />
              <button onClick={() => { closeMore(); if (moreMenuTarget.groupId) router.push(`/inprogress/group/${moreMenuTarget.groupId}`); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 text-sm font-medium text-gray-900">
                <Play size={16} className="text-gray-500" />그룹 보러가기
              </button>
            </div>
          </>
        )}

        {/* 삭제 확인 */}
        {pendingDelete && (
          <div className="absolute inset-0 z-50 flex items-end bg-black/50" onClick={() => !isDeleting && setPendingDelete(null)}>
            <div className="bg-white w-full rounded-t-3xl p-6 pb-safe" onClick={(e) => e.stopPropagation()}>
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
                  <Trash2 size={22} className="text-red-400" />
                </div>
                <h2 className="text-xl font-black text-gray-900">삭제할까요?</h2>
                <p className="text-sm text-gray-500 font-medium mt-2">삭제하면 되돌릴 수 없어요.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setPendingDelete(null)} disabled={isDeleting}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-2xl text-sm font-bold">취소</button>
                <button onClick={handleDelete} disabled={isDeleting}
                  className="flex-1 py-3 bg-red-500 text-white rounded-2xl text-sm font-bold disabled:opacity-50">
                  {isDeleting ? "삭제 중..." : "삭제"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // 5. 하루공유 결과 페이지
  // ════════════════════════════════════════════════════════════════════════
  if (view === "dayshare-detail" && selectedItem) {
    return (
      <DayshareDetailView
        item={selectedItem}
        onBack={() => { setView("dayshare"); closeMore(); }}
        onDownload={handleDayshareDownload}
        onShare={handleDayshareShare}
        isDownloading={isDownloading}
      />
    );
  }

  return null;
};

// ─── 하루공유 결과 뷰 ────────────────────────────────────────────────────────

const DayshareDetailView = ({
  item,
  onBack,
  onDownload,
  onShare,
  isDownloading,
}: {
  item: ProjectResponse;
  onBack: () => void;
  onDownload: (item: ProjectResponse) => void;
  onShare: (item: ProjectResponse) => void;
  isDownloading: boolean;
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["group", item.groupId, "members"],
    queryFn: () => groupService.getMembers(item.groupId!),
    enabled: !!item.groupId,
  });

  const { data: renderJob, isLoading: renderLoading } = useQuery({
    queryKey: ["render", "project", item.id],
    queryFn: () => renderService.getLatestJobByProject(item.id),
    retry: false,
  });

  const hasVideo = renderJob?.status === "SUCCEEDED" && renderJob?.resultUrl;

  return (
    <div className="flex flex-col h-full bg-white pb-safe overflow-hidden relative">
      <StatusBar theme="dark" />

      {/* 헤더 */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-100">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-base font-black text-gray-900 truncate max-w-[200px]">{item.title}</h1>
        <button
          onClick={() => setShowMoreMenu((v) => !v)}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <MoreHorizontal size={20} className="text-gray-500" />
        </button>
      </div>

      {/* ... 드롭다운 */}
      {showMoreMenu && (
        <>
          <div className="absolute inset-0 z-30" onClick={() => setShowMoreMenu(false)} />
          <div className="absolute top-16 right-4 z-40 bg-white rounded-2xl shadow-2xl overflow-hidden min-w-[160px]">
            <button
              onClick={() => { setShowMoreMenu(false); onDownload(item); }}
              disabled={isDownloading || !hasVideo}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 text-sm font-medium text-gray-900 disabled:opacity-40"
            >
              <Download size={16} className="text-gray-500" />다운로드
            </button>
            <div className="h-px bg-gray-100" />
            <button
              onClick={() => { setShowMoreMenu(false); onShare(item); }}
              disabled={isDownloading || !hasVideo}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 text-sm font-medium text-gray-900 disabled:opacity-40"
            >
              <Share2 size={16} className="text-gray-500" />공유하기
            </button>
          </div>
        </>
      )}

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* 함께한 멤버 */}
        <div className="px-5 pt-6 pb-2">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">함께한 멤버</h2>
          {membersLoading ? (
            <div className="flex gap-3">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-full bg-gray-100 animate-pulse" />
                  <div className="w-10 h-3 bg-gray-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : members.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-5 px-5">
              {members.map((member) => (
                <div key={member.userId} className="flex flex-col items-center gap-2 shrink-0">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center ring-2 ring-white shadow-sm">
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-black text-blue-400">
                        {member.name?.[0] ?? "?"}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-gray-700 max-w-[56px] truncate text-center">
                    {member.name}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Users size={16} />
              <span>{item.memberCount ?? 0}명 참여</span>
            </div>
          )}
        </div>

        <div className="mx-5 my-4 h-px bg-gray-100" />

        {/* 결과 영상 */}
        <div className="px-5 pb-8">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">결과 영상</h2>
          {renderLoading ? (
            <div className="aspect-[9/16] max-h-[480px] w-full bg-gray-100 rounded-2xl animate-pulse" />
          ) : hasVideo ? (
            <div className="rounded-2xl overflow-hidden bg-black shadow-xl">
              <video
                src={renderJob.resultUrl!}
                controls
                playsInline
                className="w-full max-h-[480px] object-contain"
              />
            </div>
          ) : (
            <div className="aspect-video w-full bg-gray-50 rounded-2xl flex flex-col items-center justify-center gap-3 border border-gray-100">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                <Film size={24} className="text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-400">
                {renderJob?.status === "QUEUED" || renderJob?.status === "RUNNING"
                  ? "영상 렌더링 중..."
                  : "아직 결과 영상이 없어요"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecentScreen;
