"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import StatusBar from "@/components/ui/StatusBar";
import Button from "@/components/ui/Button";
import { groupService } from "@/lib/api/groupService";
import { useApp } from "@/lib/context/AppContext";

const GroupDayFlow = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setSelectedGroup } = useApp();

  const [memberCount, setMemberCount] = useState(2);
  const [groupTitle, setGroupTitle] = useState("하루 공유 🌅");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!groupTitle.trim() || isCreating) return;
    setIsCreating(true);
    try {
      const group = await groupService.createGroup({
        name: groupTitle.trim(),
        memberCount,
      });
      // Invalidate group projects list
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      // Navigate to group screen
      if (group.projectId) {
        setSelectedGroup({ id: group.id, projectId: group.projectId, name: group.name });
        router.push("/inprogress");
      } else {
        router.push("/inprogress");
      }
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
        <div className="space-y-3">
          <label className="text-sm font-bold text-gray-900">그룹 이름</label>
          <input
            type="text"
            value={groupTitle}
            onChange={(e) => setGroupTitle(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            placeholder="그룹 이름을 입력하세요"
          />
        </div>
        <div className="space-y-3">
          <label className="text-sm font-bold text-gray-900">함께할 인원</label>
          <div className="flex flex-col gap-3">
            {[2, 3, 4].map((num) => (
              <button
                key={num}
                onClick={() => setMemberCount(num)}
                className={`w-full p-4 rounded-2xl transition-all border-2 flex items-center justify-between ${
                  memberCount === num
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-100 hover:border-gray-200"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2">
                    {[...Array(num)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-8 h-8 rounded-full border-2 border-white ${
                          memberCount === num ? "bg-blue-200" : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  <span
                    className={`font-bold text-lg ${
                      memberCount === num ? "text-blue-600" : "text-gray-600"
                    }`}
                  >
                    {num}명
                  </span>
                </div>
                {memberCount === num && <Check className="text-blue-600" />}
              </button>
            ))}
          </div>
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
