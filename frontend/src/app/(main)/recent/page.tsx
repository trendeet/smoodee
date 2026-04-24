"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Search, Layers, Trash2, CheckCircle2, Circle, Film } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import StatusBar from "@/components/ui/StatusBar";
import { useUI } from "@/lib/context/UIContext";
import { useProjects } from "@/hooks/useProjects";
import { projectService } from "@/lib/api/projectService";
import { LAYOUT_CONFIG } from "@/features/colorwork/layoutConfig";

const RecentScreen = () => {
  const router = useRouter();
  const { openMenu } = useUI();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState("");
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [pendingDeleteIds, setPendingDeleteIds] = useState<number[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: recentProjects = [], isLoading } = useProjects({ tab: "RECENT" });

  const filteredItems = recentProjects.filter(
    (item) => (item.title ?? "").toLowerCase().includes(searchText.toLowerCase())
  );

  const isAllSelected = filteredItems.length > 0 && filteredItems.every((p) => selectedIds.has(p.id));

  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(isAllSelected ? new Set() : new Set(filteredItems.map((p) => p.id)));
  };

  const handleDeleteConfirm = async () => {
    if (pendingDeleteIds.length === 0 || isDeleting) return;
    setIsDeleting(true);
    try {
      await Promise.all(pendingDeleteIds.map((id) => projectService.deleteProject(id)));
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      exitSelectMode();
    } finally {
      setIsDeleting(false);
      setPendingDeleteIds([]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white pb-safe overflow-hidden relative">
      <StatusBar theme="dark" />

      {/* 헤더 */}
      <div className="px-4 pt-4 pb-2 sticky top-0 bg-white/95 backdrop-blur-md z-10">
        <div className="flex items-center justify-between mb-4">
          {isSelectMode ? (
            <>
              <button
                onClick={toggleSelectAll}
                className="text-sm font-bold text-gray-600 hover:text-black transition-colors"
              >
                {isAllSelected ? "전체 해제" : "전체 선택"}
              </button>
              <span className="text-sm font-bold text-gray-900">{selectedIds.size}개 선택됨</span>
              <button
                onClick={exitSelectMode}
                className="text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
              >
                취소
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <button
                  onClick={openMenu}
                  className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Menu size={24} />
                </button>
                <h1 className="text-2xl font-black tracking-tight text-gray-900">보관함</h1>
              </div>
              {recentProjects.length > 0 && (
                <button
                  onClick={() => setIsSelectMode(true)}
                  className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors px-2 py-1"
                >
                  선택
                </button>
              )}
            </>
          )}
        </div>
        {!isSelectMode && (
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="보관함 검색..."
              className="w-full bg-gray-100 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-black/10"
            />
          </div>
        )}
      </div>

      {/* 카드 목록 */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))
        ) : filteredItems.length > 0 ? (
          filteredItems.map((item) => {
            const isSelected = selectedIds.has(item.id);
            return (
              <div
                key={item.id}
                onClick={() => {
                  if (isSelectMode) {
                    toggleSelect(item.id);
                  } else if (item.templateType === "COLORWORK") {
                    router.push(`/colorwork?projectId=${item.id}&step=4`);
                  }
                }}
                className={`flex gap-4 p-3 border-2 rounded-2xl transition-all cursor-pointer ${
                  isSelected
                    ? "border-red-400 bg-red-50/30 shadow-red-100"
                    : "border-gray-100 hover:bg-gray-50"
                }`}
              >
                {/* 선택 체크박스 */}
                {isSelectMode && (
                  <div className="flex items-center shrink-0">
                    {isSelected
                      ? <CheckCircle2 size={22} className="text-red-500" />
                      : <Circle size={22} className="text-gray-300" />}
                  </div>
                )}

                {/* 썸네일 */}
                {item.templateType === "COLORWORK" ? (
                  <div
                    className="w-20 h-24 rounded-xl shrink-0 shadow-sm relative overflow-hidden flex items-center justify-center"
                    style={{ backgroundColor: item.paletteColor ?? "#e5e7eb" }}
                  >
                    {item.status === "DONE" && item.thumbnailUrl ? (
                      <img src={item.thumbnailUrl} alt="colorwork" className="w-full h-full object-cover" />
                    ) : item.frameUrls && item.frameUrls.length > 0 && item.gridType ? (
                      (() => {
                        const cfg = LAYOUT_CONFIG[item.gridType as keyof typeof LAYOUT_CONFIG];
                        return cfg ? (
                          <div
                            className="w-full h-full grid p-[4px]"
                            style={{
                              gridTemplateAreas: cfg.containerStyle.gridTemplateAreas,
                              gridTemplateColumns: cfg.containerStyle.gridTemplateColumns,
                              gridTemplateRows: cfg.containerStyle.gridTemplateRows,
                              gap: "2px",
                            }}
                          >
                            {item.frameUrls.map((url, i) => (
                              <div
                                key={i}
                                className="overflow-hidden rounded-[2px] min-h-0 min-w-0"
                                style={{ gridArea: cfg.areas[i] }}
                              >
                                <img src={url} alt="" className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        ) : null;
                      })()
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="grid grid-cols-2 gap-0.5 w-10 h-10 opacity-40">
                          {[0,1,2,3].map(i => (
                            <div key={i} className="rounded-sm bg-white" />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-20 h-24 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-300 shrink-0 shadow-sm flex flex-col items-center justify-center gap-1">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                      <Film size={14} className="text-white" />
                    </div>
                    <span className="font-black text-[8px] text-white tracking-tight text-center leading-tight">DAY<br/>SHARE</span>
                  </div>
                )}

                {/* 정보 */}
                <div className="flex flex-col justify-center flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-gray-400 mb-0.5">
                        {item.templateType === "COLORWORK" ? "컬러워크" : "하루공유"}
                      </p>
                      <h3 className="font-bold text-gray-900 truncate">
                        {item.templateType === "COLORWORK" ? "컬러워크" : item.title}
                      </h3>
                    </div>
                    {!isSelectMode && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setPendingDeleteIds([item.id]); }}
                        className="p-1.5 rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors shrink-0 ml-2"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 font-medium">
                    {new Date(item.updatedAt).toLocaleDateString("ko-KR")}
                  </p>
                  {item.templateType === "COLORWORK" && item.totalFrames != null && (
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {item.filledFrames}/{item.totalFrames} 컷
                    </p>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Layers size={24} className="opacity-20" />
            </div>
            <p className="text-sm font-medium">
              {searchText ? "검색 결과가 없어요" : "완료된 항목이 없어요"}
            </p>
          </div>
        )}
      </div>

      {/* 선택 모드 하단 삭제 바 */}
      {isSelectMode && (
        <div className="bg-white border-t border-gray-100 px-4 py-3 pb-safe flex items-center gap-3">
          <span className="flex-1 text-sm font-bold text-gray-500">
            {selectedIds.size > 0 ? `${selectedIds.size}개 선택됨` : "항목을 선택하세요"}
          </span>
          <button
            onClick={() => setPendingDeleteIds(Array.from(selectedIds))}
            disabled={selectedIds.size === 0}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-red-500 text-white text-sm font-bold rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all"
          >
            <Trash2 size={16} />
            삭제
          </button>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {pendingDeleteIds.length > 0 && (
        <div
          className="absolute inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => !isDeleting && setPendingDeleteIds([])}
        >
          <div
            className="bg-white w-full rounded-t-3xl p-6 pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <Trash2 size={24} className="text-red-400" />
              </div>
              <h2 className="text-xl font-black text-gray-900">
                {pendingDeleteIds.length > 1 ? `${pendingDeleteIds.length}개를 삭제할까요?` : "프로젝트를 삭제할까요?"}
              </h2>
              <p className="text-sm text-gray-500 font-medium mt-2">삭제하면 되돌릴 수 없어요.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingDeleteIds([])}
                disabled={isDeleting}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-2xl text-sm font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 py-3 bg-red-500 text-white rounded-2xl text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isDeleting ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentScreen;
