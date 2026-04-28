"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Camera, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import StatusBar from "@/components/ui/StatusBar";
import Button from "@/components/ui/Button";
import { groupService } from "@/lib/api/groupService";
import { slotService } from "@/lib/api/slotService";

const GroupDayFlow = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [groupTitle, setGroupTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleCreate = async () => {
    if (!groupTitle.trim() || isCreating) return;
    setIsCreating(true);
    try {
      const group = await groupService.createGroup({ name: groupTitle.trim() });
      if (coverFile) {
        await groupService.uploadCoverImage(group.id, coverFile);
      }
      // 기본 소개 슬롯 추가 (영상 맨 앞)
      await slotService.createSlot(group.id, { timeLabel: "소개" });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      router.push(`/inprogress/group/${group.id}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white animate-fade-in relative">
      <StatusBar theme="dark" />
      <div className="px-6 pt-12 pb-6">
        <button
          onClick={() => router.back()}
          className="mb-6 p-2 -ml-2 rounded-full hover:bg-gray-100 w-fit"
        >
          <ChevronLeft />
        </button>
        <h1 className="text-3xl font-black mb-2">
          새로운 그룹을
          <br />
          만들어볼까요?
        </h1>
        <p className="text-gray-500">그룹 정보를 입력해주세요.</p>
      </div>

      <div className="flex-1 px-6 flex flex-col gap-8 overflow-y-auto no-scrollbar">
        {/* 커버 이미지 */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-gray-900">커버 이미지 <span className="text-gray-400 font-normal">(선택)</span></label>
          <div className="flex items-center gap-4">
            <div
              className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 cursor-pointer relative shrink-0"
              onClick={() => fileInputRef.current?.click()}
            >
              {coverPreview ? (
                <img src={coverPreview} alt="cover" className="w-full h-full object-cover" />
              ) : (
                <Camera size={22} className="text-gray-300" />
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-sm font-bold text-gray-700 bg-gray-100 px-4 py-2 rounded-xl active:scale-95 transition-transform"
              >
                {coverPreview ? "이미지 변경" : "이미지 선택"}
              </button>
              {coverPreview && (
                <button
                  onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                  className="text-xs text-gray-400 flex items-center gap-1"
                >
                  <X size={10} /> 제거
                </button>
              )}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCoverSelect}
          />
        </div>

        {/* 그룹 이름 */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-gray-900">그룹 이름</label>
          <input
            type="text"
            value={groupTitle}
            onChange={(e) => setGroupTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            placeholder="그룹 이름을 넣어주세요."
          />
          <p className="text-xs text-gray-500">초대코드로 <strong className="text-black">최대 8명</strong>까지 초대할 수 있어요.</p>
        </div>
      </div>

      <div className="p-6 pb-safe safe-area-bottom">
        <Button size="lg" onClick={handleCreate} disabled={!groupTitle.trim() || isCreating}>
          {isCreating ? "생성 중..." : "그룹 만들기"}
        </Button>
      </div>
    </div>
  );
};

export default GroupDayFlow;
