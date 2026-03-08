import React, { useState } from "react";
import { ChevronLeft, Check } from "lucide-react";
import StatusBar from "@/components/ui/StatusBar";
import Button from "@/components/ui/Button";
import { DAY_SHARE_SLOTS } from "@/lib/mock-data/groups";
import { Group } from "@/lib/mock-data/groups";
import { Template } from "@/lib/mock-data/templates";

interface GroupDayFlowProps {
  onBack: () => void;
  onCreateGroup: (newGroup: Group) => void;
  template?: Template | null;
}

const GroupDayFlow = ({ onBack, onCreateGroup, template }: GroupDayFlowProps) => {
  const [memberCount, setMemberCount] = useState(2);
  const [groupTitle, setGroupTitle] = useState(
    template ? `${template.title} 그룹` : "하루 공유 🌅"
  );

  const handleCreate = () => {
    const mockMembers: { name: string; role: string; avatar: string; status: string }[] = [];
    const roles = ["나", "Friend 1", "Friend 2", "Friend 3"];
    const colors = [
      "bg-gray-900",
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
    ];

    for (let i = 0; i < memberCount; i++) {
      mockMembers.push({
        name: roles[i],
        role: i === 0 ? "Owner" : "Member",
        avatar: colors[i],
        status: i === 0 ? "기록 시작!" : "함께해요",
      });
    }

    const newGroup: Group = {
      id: `g${Date.now()}`,
      title: groupTitle,
      members: memberCount,
      status: "active",
      progress: 0,
      theme: template?.id === "t1" ? "bg-red-50" : "bg-blue-50",
      icon: template?.id === "t1" ? "🎨" : "🌅",
      description:
        template?.id === "t1"
          ? "나만의 컬러 팔레트를 그룹과 함께 채워보세요!"
          : "우리의 하루를 영상으로 기록했어요.",
      type: template?.id || "day_share",
      memberList: mockMembers,
      slots: DAY_SHARE_SLOTS.map((s) => ({
        id: `slot_${s.id}`,
        label: s.label,
        time: s.time,
        user: "나",
        status: "empty",
        color: "bg-blue-500",
      })),
    };
    onCreateGroup(newGroup);
  };

  return (
    <div className="flex flex-col h-full bg-white animate-fade-in relative">
      <StatusBar theme="dark" />
      <div className="px-6 pt-12 pb-6">
        <button
          onClick={onBack}
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
        <Button size="lg" onClick={handleCreate} disabled={!groupTitle.trim()}>
          그룹 만들기
        </Button>
      </div>
    </div>
  );
};

export default GroupDayFlow;
