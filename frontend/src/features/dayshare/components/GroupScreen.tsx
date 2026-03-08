import React, { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  Share2,
  Camera,
  Plus,
  MessageCircle,
  Send,
  Info,
  Eye,
  Check,
  Clock,
  FolderClock,
} from "lucide-react";
import StatusBar from "@/components/ui/StatusBar";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";
import MockResultModal from "./MockResultModal";
import { Group, GroupSlot } from "@/lib/mock-data/groups";
import { ChatMessage, MOCK_CHAT_MESSAGES, TIME_OPTIONS } from "@/lib/mock-data/messages";
import { timeToMinutes } from "@/lib/utils/time";

interface GroupScreenProps {
  activeTab: string;
  navigateTo: (screen: string, params?: any) => void;
  onOpenMenu: () => void;
  groups: Group[];
  onGroupSelect: (group: Group) => void;
  selectedGroup: Group | null;
  onBackToList: () => void;
  setGroups: (groups: Group[]) => void;
}

const GroupScreen = ({
  activeTab,
  navigateTo,
  onOpenMenu,
  groups,
  onGroupSelect,
  selectedGroup,
  onBackToList,
  setGroups,
}: GroupScreenProps) => {
  const [showInviteToast, setShowInviteToast] = useState(false);
  const [showArchiveToast, setShowArchiveToast] = useState(false);
  const [showTimeOrderToast, setShowTimeOrderToast] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState("status");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_CHAT_MESSAGES);
  const [showMockResult, setShowMockResult] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedGroup && scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, activeSubTab, selectedGroup]);
  if (activeTab !== "group" || !selectedGroup) return null;

  const handleInvite = () => {
    setShowInviteToast(true);
    setTimeout(() => setShowInviteToast(false), 2000);
  };
  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const newMessage: ChatMessage = {
      id: Date.now(),
      user: "나",
      text: chatInput,
      time: new Date().toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      isMe: true,
    };
    setMessages([...messages, newMessage]);
    setChatInput("");
  };

  const handleNameChange = (slotId: string, newName: string) => {
    let updatedCurrentGroup: Group | null = null;
    const updatedGroups = groups.map((g) => {
      if (g.id === selectedGroup.id) {
        const updatedSlots = g.slots.map((s) =>
          s.id === slotId ? { ...s, name: newName, label: newName } : s
        );
        updatedCurrentGroup = { ...g, slots: updatedSlots };
        return updatedCurrentGroup;
      }
      return g;
    });
    setGroups(updatedGroups);
    if (updatedCurrentGroup) onGroupSelect(updatedCurrentGroup);
  };

  const handleSlotCapture = (slotId: string) => {
    setIsProcessing(true);
    setTimeout(() => {
      let updatedCurrentGroup: Group | null = null;
      const updatedGroups = groups.map((g) => {
        if (g.id === selectedGroup.id) {
          const updatedSlots = g.slots.map((s) =>
            s.id === slotId
              ? { ...s, status: "filled", user: "나", color: "bg-blue-500" }
              : s
          );
          const newProgress = Math.round(
            (updatedSlots.filter((s) => s.status === "filled").length /
              updatedSlots.length) *
              100
          );
          updatedCurrentGroup = {
            ...g,
            slots: updatedSlots,
            progress: newProgress,
          };
          return updatedCurrentGroup;
        }
        return g;
      });
      setGroups(updatedGroups);
      if (updatedCurrentGroup) onGroupSelect(updatedCurrentGroup);
      setIsProcessing(false);
    }, 1000);
  };

  const handleTimeChange = (slotId: string, newTime: string) => {
    const currentGroup = groups.find((g) => g.id === selectedGroup.id);
    if (!currentGroup) return;
    const slotIndex = currentGroup.slots.findIndex((s) => s.id === slotId);
    const newMins = timeToMinutes(newTime);

    let isValid = true;
    if (slotIndex > 0) {
      const prevTime =
        currentGroup.slots[slotIndex - 1].time ||
        currentGroup.slots[slotIndex - 1].label.split(" ")[0];
      if (timeToMinutes(prevTime) >= newMins) isValid = false;
    }
    if (slotIndex < currentGroup.slots.length - 1) {
      const nextTime =
        currentGroup.slots[slotIndex + 1].time ||
        currentGroup.slots[slotIndex + 1].label.split(" ")[0];
      if (timeToMinutes(nextTime) <= newMins) isValid = false;
    }

    if (!isValid) {
      setShowTimeOrderToast(true);
      setTimeout(() => setShowTimeOrderToast(false), 2000);
      return;
    }

    let updatedCurrentGroup: Group | null = null;
    const updatedGroups = groups.map((g) => {
      if (g.id === selectedGroup.id) {
        const updatedSlots = g.slots.map((s) =>
          s.id === slotId ? { ...s, time: newTime, label: newTime } : s
        );
        updatedCurrentGroup = { ...g, slots: updatedSlots };
        return updatedCurrentGroup;
      }
      return g;
    });
    setGroups(updatedGroups);
    if (updatedCurrentGroup) onGroupSelect(updatedCurrentGroup);
  };

  const handleAddSlot = () => {
    let updatedCurrentGroup: Group | null = null;
    const updatedGroups = groups.map((g) => {
      if (g.id === selectedGroup.id) {
        const newSlotId = `slot_${Date.now()}`;
        let newTime = "00:00";
        if (g.slots && g.slots.length > 0) {
          const lastTime =
            g.slots[g.slots.length - 1].time ||
            g.slots[g.slots.length - 1].label.split(" ")[0];
          const lastMins = timeToMinutes(lastTime);
          let nextMins = lastMins + 15;
          if (nextMins > 24 * 60 - 15) nextMins = 24 * 60 - 15;
          const h = Math.floor(nextMins / 60);
          const m = nextMins % 60;
          newTime = `${h.toString().padStart(2, "0")}:${m
            .toString()
            .padStart(2, "0")}`;
        }
        const newSlot: GroupSlot = {
          id: newSlotId,
          label: newTime,
          time: newTime,
          user: "",
          status: "empty",
          color: "bg-blue-500",
        };
        const updatedSlots = [...(g.slots || []), newSlot];
        const newProgress = Math.round(
          (updatedSlots.filter((s) => s.status === "filled").length /
            updatedSlots.length) *
            100
        );
        updatedCurrentGroup = {
          ...g,
          slots: updatedSlots,
          progress: newProgress,
        };
        return updatedCurrentGroup;
      }
      return g;
    });
    setGroups(updatedGroups);
    if (updatedCurrentGroup) onGroupSelect(updatedCurrentGroup);
  };

  return (
    <div className="flex flex-col h-full bg-white pb-safe overflow-y-auto no-scrollbar animate-slide-left">
      <StatusBar theme="dark" />
      {showInviteToast && <Toast message="초대 링크가 복사되었습니다!" />}
      {showArchiveToast && <Toast message="보관함으로 이동되었습니다!" />}
      {showTimeOrderToast && (
        <Toast message="시간 순서대로 맞춰 설정해주세요" type="error" />
      )}
      <MockResultModal
        isOpen={showMockResult}
        onClose={() => setShowMockResult(false)}
        memberCount={selectedGroup.members}
        slots={selectedGroup.slots}
      />

      <div className="px-4 py-4 bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={onBackToList}
            className="p-1 -ml-1 rounded-full hover:bg-gray-100 text-gray-600"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight truncate">
              {selectedGroup.title}
            </h1>
            <p className="text-xs text-gray-500">
              참여자 {selectedGroup.members}명 • 오늘 기록 중
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleInvite}
            icon={Share2}
            className="rounded-full border-gray-200 h-8 text-xs"
          >
            초대
          </Button>
        </div>
        <div className="mb-4">
          <h3 className="text-xs font-bold text-gray-500 mb-2 px-1">
            함께하는 멤버
          </h3>
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-1">
            {selectedGroup.memberList
              ? selectedGroup.memberList.map((member, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center gap-1 min-w-[50px]"
                  >
                    <div
                      className={`w-10 h-10 rounded-full ${member.avatar} flex items-center justify-center text-white text-xs font-bold ring-2 ring-white shadow-sm`}
                    >
                      {member.name[0]}
                    </div>
                    <span className="text-[10px] font-medium text-gray-600 truncate max-w-[50px]">
                      {member.name}
                    </span>
                  </div>
                ))
              : [...Array(selectedGroup.members)].map((_, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-1 min-w-[50px]"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-bold">
                      {i === 0 ? "나" : `M${i}`}
                    </div>
                    <span className="text-[10px] font-medium text-gray-600">
                      {i === 0 ? "나" : `멤버 ${i}`}
                    </span>
                  </div>
                ))}
            <button
              onClick={handleInvite}
              className="flex flex-col items-center gap-1 min-w-[50px]"
            >
              <div className="w-10 h-10 rounded-full bg-white border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                <Plus size={16} />
              </div>
              <span className="text-[10px] font-medium text-gray-400">
                초대
              </span>
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab("status")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
              activeSubTab === "status"
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            <Camera size={14} />
            인증 현황
          </button>
          <button
            onClick={() => setActiveSubTab("chat")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
              activeSubTab === "chat"
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            <MessageCircle size={14} />
            채팅
          </button>
        </div>
      </div>
      {activeSubTab === "status" ? (
        <div className="animate-fade-in pb-20">
          <div className="mx-4 mt-4 bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex gap-3">
            <div className="bg-white p-2 rounded-full h-fit text-indigo-600 shadow-sm">
              <Info size={16} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-indigo-900 mb-1">
                오늘의 미션
              </h3>
              <p className="text-xs text-indigo-700 leading-relaxed">
                {["day_share", "t_day"].includes(selectedGroup.type)
                  ? "오늘 정해진 시간에 3초 영상을 기록하세요! 📹"
                  : "오늘 12시까지 점심 사진을 인증하세요! 📸"}
              </p>
            </div>
          </div>
          {["day_share", "t_day"].includes(selectedGroup.type) && (
            <div className="px-4 mt-4">
              <button
                onClick={() => setShowMockResult(true)}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-98 transition-transform"
              >
                <Eye size={18} /> 결과 예시 보기
              </button>
            </div>
          )}

          {selectedGroup.progress === 100 ||
          (selectedGroup.slots &&
            selectedGroup.slots.every((s) => s.status === "filled")) ? (
            <div className="mx-4 mt-4 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-3xl p-6 flex flex-col items-center justify-center shadow-xl shadow-indigo-200 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-3 backdrop-blur-sm shadow-inner">
                <Check size={24} className="text-white" strokeWidth={3} />
              </div>
              <h3 className="font-black text-xl mb-1 tracking-tight">
                100% 달성 완료! 🎉
              </h3>
              <p className="text-xs text-indigo-100 mb-5 font-medium">
                오늘의 모든 기록이 채워졌습니다.
              </p>
              <button
                onClick={() => {
                  setShowArchiveToast(true);
                  setTimeout(() => {
                    setShowArchiveToast(false);
                    onBackToList();
                  }, 1500);
                }}
                className="w-full py-3.5 bg-white text-indigo-600 rounded-2xl font-black shadow-lg hover:bg-indigo-50 transition-colors active:scale-95 mb-3 flex items-center justify-center gap-2"
              >
                <FolderClock size={18} /> 보관함으로 옮기기
              </button>
              <p className="text-[10px] text-indigo-200 font-medium">
                2일 뒤 보관함으로 자동 이동됩니다
              </p>
            </div>
          ) : (
            <div className="mx-4 mt-4 bg-[#1A1A1A] text-white rounded-3xl p-5 flex items-center justify-between shadow-xl shadow-gray-200 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
              <div className="relative z-10">
                <div className="text-xs text-gray-400 mb-1 font-medium">
                  오늘 마감까지
                </div>
                <div className="text-3xl font-mono font-bold text-yellow-400 tracking-tighter">
                  03:21:45
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center animate-pulse border border-white/5 backdrop-blur relative z-10">
                <Clock size={24} className="text-yellow-400" />
              </div>
            </div>
          )}

          <div className="p-4 grid grid-cols-2 gap-3">
            {selectedGroup.slots &&
              selectedGroup.slots.map((slot) => (
                <div
                  key={slot.id}
                  className="border border-gray-200 rounded-2xl p-4 flex flex-col justify-between h-36 relative overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start z-10">
                    <select
                      value={slot.time || slot.label.split(" ")[0]}
                      onChange={(e) =>
                        handleTimeChange(slot.id, e.target.value)
                      }
                      className="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded-md text-gray-500 font-mono tracking-tight text-center focus:ring-2 focus:ring-blue-500 outline-none transition-all border border-transparent focus:bg-white cursor-pointer"
                    >
                      {TIME_OPTIONS.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                    {slot.status === "filled" && (
                      <div className="bg-green-100 p-1 rounded-full">
                        <Check
                          size={10}
                          className="text-green-600"
                          strokeWidth={3}
                        />
                      </div>
                    )}
                  </div>

                  {slot.status === "filled" && (
                    <div
                      className={`absolute inset-0 ${
                        slot.color || "bg-blue-500"
                      } opacity-10`}
                    />
                  )}

                  {slot.status !== "filled" && (
                    <div className="flex flex-col items-center justify-center flex-1 mt-2 z-10">
                      <button
                        onClick={() => handleSlotCapture(slot.id)}
                        className="w-10 h-10 rounded-full bg-gray-50 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 mb-2 hover:bg-black hover:text-white hover:border-black transition-all group"
                      >
                        {isProcessing ? (
                          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Camera
                            size={18}
                            className="group-hover:scale-110 transition-transform"
                          />
                        )}
                      </button>
                    </div>
                  )}

                  <div className="z-10 mt-auto flex flex-col w-full">
                    <input
                      type="text"
                      value={
                        slot.name !== undefined
                          ? slot.name
                          : slot.label.replace(/^[0-9]{2}:[0-9]{2} /, "")
                      }
                      onChange={(e) =>
                        handleNameChange(slot.id, e.target.value)
                      }
                      className={`font-bold text-base leading-tight bg-transparent border-none p-0 focus:ring-0 outline-none w-full placeholder-gray-300 ${
                        slot.status === "filled"
                          ? "text-gray-900"
                          : "text-gray-600 text-center"
                      }`}
                      placeholder="이름 입력"
                    />
                    {slot.status === "filled" && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-5 h-5 rounded-full bg-gray-900 text-white flex items-center justify-center text-[10px] font-bold">
                          {slot.user[0]}
                        </div>
                        <p className="text-xs text-gray-500 font-medium">
                          {slot.user}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            <button
              onClick={handleAddSlot}
              className="border-2 border-dashed border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center h-36 text-gray-400 hover:bg-gray-50 hover:text-gray-600 hover:border-gray-300 transition-all active:scale-95 group"
            >
              <div className="w-10 h-10 rounded-full bg-gray-50 group-hover:bg-white border border-transparent group-hover:border-gray-200 flex items-center justify-center mb-2 transition-all">
                <Plus size={20} />
              </div>
              <span className="text-[10px] font-bold">시간 추가하기</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full bg-gray-50 animate-fade-in pb-16 relative">
          <div
            className="flex-1 overflow-y-auto p-4 space-y-3 pb-20"
            ref={scrollRef}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.isMe ? "items-end" : "items-start"
                } ${msg.isSystem ? "items-center !my-4" : ""}`}
              >
                {msg.isSystem ? (
                  <span className="text-[10px] bg-gray-200 text-gray-500 px-3 py-1 rounded-full">
                    {msg.text}
                  </span>
                ) : (
                  <>
                    {!msg.isMe && (
                      <span className="text-[10px] text-gray-500 ml-1 mb-1">
                        {msg.user}
                      </span>
                    )}
                    <div
                      className={`max-w-[75%] p-3 rounded-2xl text-sm shadow-sm ${
                        msg.isMe
                          ? "bg-blue-600 text-white rounded-tr-none"
                          : "bg-white border border-gray-100 rounded-tl-none text-gray-800"
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 mx-1">
                      {msg.time}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="p-3 bg-white border-t border-gray-100 flex items-center gap-2 absolute bottom-0 left-0 right-0 w-full z-20 safe-area-bottom">
            <button className="p-2 rounded-full text-gray-400 hover:bg-gray-100">
              <Plus size={20} />
            </button>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="메시지를 입력하세요..."
              className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
            />
            <button
              onClick={handleSendMessage}
              className={`p-2.5 rounded-full transition-colors ${
                chatInput.trim()
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-400"
              }`}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupScreen;
