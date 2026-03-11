"use client";

import React, { useState, useRef, useEffect } from "react";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import StatusBar from "@/components/ui/StatusBar";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";
import MockResultModal from "./MockResultModal";
import { groupService } from "@/lib/api/groupService";
import { slotService } from "@/lib/api/slotService";
import { chatService } from "@/lib/api/chatService";
import { assetService } from "@/lib/api/assetService";
import { useApp } from "@/lib/context/AppContext";
import { timeToMinutes } from "@/lib/utils/time";
import { TIME_OPTIONS } from "@/lib/mock-data/messages";

const GroupScreen = () => {
  const queryClient = useQueryClient();
  const { selectedGroup, setSelectedGroup } = useApp();

  const groupId = selectedGroup?.id ?? null;

  // ── Remote data ─────────────────────────────────────────────────────────
  const { data: group } = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => groupService.getGroup(groupId!),
    enabled: groupId !== null,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["group", groupId, "members"],
    queryFn: () => groupService.getMembers(groupId!),
    enabled: groupId !== null,
  });

  const { data: slots = [], isLoading: slotsLoading } = useQuery({
    queryKey: ["group", groupId, "slots"],
    queryFn: () => slotService.listSlots(groupId!),
    enabled: groupId !== null,
  });

  const { data: progress } = useQuery({
    queryKey: ["group", groupId, "progress"],
    queryFn: () => slotService.getProgress(groupId!),
    enabled: groupId !== null,
  });

  const { data: chatPage } = useQuery({
    queryKey: ["group", groupId, "chat"],
    queryFn: () => chatService.listMessages(groupId!),
    enabled: groupId !== null,
    refetchInterval: 10_000,
  });

  const messages = chatPage?.items ?? [];

  // ── Mutations ────────────────────────────────────────────────────────────
  const createSlot = useMutation({
    mutationFn: (scheduledTime: string) =>
      slotService.createSlot(groupId!, { scheduledTime }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["group", groupId, "slots"] }),
  });

  const updateSlot = useMutation({
    mutationFn: ({ slotId, body }: { slotId: number; body: { scheduledTime?: string; label?: string } }) =>
      slotService.updateSlot(groupId!, slotId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["group", groupId, "slots"] }),
  });

  const sendMessage = useMutation({
    mutationFn: (content: string) => chatService.sendMessage(groupId!, { content }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["group", groupId, "chat"] }),
  });

  // ── Local UI state ───────────────────────────────────────────────────────
  const [showInviteToast, setShowInviteToast] = useState(false);
  const [showArchiveToast, setShowArchiveToast] = useState(false);
  const [showTimeOrderToast, setShowTimeOrderToast] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState("status");
  const [chatInput, setChatInput] = useState("");
  const [showMockResult, setShowMockResult] = useState(false);
  const [uploadingSlotId, setUploadingSlotId] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingSlotId = useRef<number | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeSubTab]);

  if (!selectedGroup) return null;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleInvite = () => {
    const code = group?.inviteCode;
    if (code) navigator.clipboard.writeText(code).catch(() => {});
    setShowInviteToast(true);
    setTimeout(() => setShowInviteToast(false), 2000);
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    sendMessage.mutate(chatInput.trim());
    setChatInput("");
  };

  const handleAddSlot = () => {
    const lastSlot = slots[slots.length - 1];
    let newTime = "09:00";
    if (lastSlot) {
      const lastMins = timeToMinutes(lastSlot.scheduledTime);
      let nextMins = lastMins + 15;
      if (nextMins > 24 * 60 - 1) nextMins = 24 * 60 - 1;
      const h = Math.floor(nextMins / 60);
      const m = nextMins % 60;
      newTime = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
    }
    createSlot.mutate(newTime);
  };

  const handleTimeChange = (slotId: number, newTime: string, currentIndex: number) => {
    const newMins = timeToMinutes(newTime);
    let isValid = true;
    if (currentIndex > 0) {
      if (timeToMinutes(slots[currentIndex - 1].scheduledTime) >= newMins) isValid = false;
    }
    if (currentIndex < slots.length - 1) {
      if (timeToMinutes(slots[currentIndex + 1].scheduledTime) <= newMins) isValid = false;
    }
    if (!isValid) {
      setShowTimeOrderToast(true);
      setTimeout(() => setShowTimeOrderToast(false), 2000);
      return;
    }
    updateSlot.mutate({ slotId, body: { scheduledTime: newTime } });
  };

  const handleSlotClick = (slotId: number) => {
    pendingSlotId.current = slotId;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const slotId = pendingSlotId.current;
    if (!file || slotId === null || groupId === null) return;
    e.target.value = "";
    pendingSlotId.current = null;
    setUploadingSlotId(slotId);
    try {
      const asset = await assetService.uploadAsset(selectedGroup.projectId ?? groupId, file);
      await slotService.bindUpload(groupId, slotId, asset.id);
      queryClient.invalidateQueries({ queryKey: ["group", groupId, "slots"] });
      queryClient.invalidateQueries({ queryKey: ["group", groupId, "progress"] });
    } finally {
      setUploadingSlotId(null);
    }
  };

  const progressPercent = progress?.progressPercent ?? 0;
  const isAllFilled = progressPercent === 100;
  const displayName = group?.name ?? selectedGroup.name;
  const memberCount = group?.memberCount ?? members.length;

  return (
    <div className="flex flex-col h-full bg-white pb-safe overflow-y-auto no-scrollbar animate-slide-left">
      <StatusBar theme="dark" />
      {showInviteToast && <Toast message="초대 코드가 복사되었습니다!" />}
      {showArchiveToast && <Toast message="보관함으로 이동되었습니다!" />}
      {showTimeOrderToast && (
        <Toast message="시간 순서대로 맞춰 설정해주세요" type="error" />
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <MockResultModal
        isOpen={showMockResult}
        onClose={() => setShowMockResult(false)}
        memberCount={memberCount}
        slots={[]}
      />

      {/* Header */}
      <div className="px-4 py-4 bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setSelectedGroup(null)}
            className="p-1 -ml-1 rounded-full hover:bg-gray-100 text-gray-600"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight truncate">{displayName}</h1>
            <p className="text-xs text-gray-500">
              참여자 {memberCount}명 • 오늘 기록 중
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

        {/* Members */}
        <div className="mb-4">
          <h3 className="text-xs font-bold text-gray-500 mb-2 px-1">함께하는 멤버</h3>
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-1">
            {members.length > 0
              ? members.map((member) => (
                  <div key={member.userId} className="flex flex-col items-center gap-1 min-w-[50px]">
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} alt={member.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white shadow-sm">
                        {member.name?.[0] ?? "?"}
                      </div>
                    )}
                    <span className="text-[10px] font-medium text-gray-600 truncate max-w-[50px]">
                      {member.name}
                    </span>
                  </div>
                ))
              : [...Array(memberCount)].map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 min-w-[50px]">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-bold">
                      {i === 0 ? "나" : `M${i}`}
                    </div>
                    <span className="text-[10px] font-medium text-gray-600">{i === 0 ? "나" : `멤버 ${i}`}</span>
                  </div>
                ))}
            <button onClick={handleInvite} className="flex flex-col items-center gap-1 min-w-[50px]">
              <div className="w-10 h-10 rounded-full bg-white border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                <Plus size={16} />
              </div>
              <span className="text-[10px] font-medium text-gray-400">초대</span>
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab("status")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${activeSubTab === "status" ? "bg-black text-white" : "bg-gray-100 text-gray-500"}`}
          >
            <Camera size={14} /> 인증 현황
          </button>
          <button
            onClick={() => setActiveSubTab("chat")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${activeSubTab === "chat" ? "bg-black text-white" : "bg-gray-100 text-gray-500"}`}
          >
            <MessageCircle size={14} /> 채팅
          </button>
        </div>
      </div>

      {/* Status Tab */}
      {activeSubTab === "status" ? (
        <div className="animate-fade-in pb-20">
          <div className="mx-4 mt-4 bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex gap-3">
            <div className="bg-white p-2 rounded-full h-fit text-indigo-600 shadow-sm">
              <Info size={16} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-indigo-900 mb-1">오늘의 미션</h3>
              <p className="text-xs text-indigo-700 leading-relaxed">
                오늘 정해진 시간에 3초 영상을 기록하세요! 📹
              </p>
            </div>
          </div>

          <div className="px-4 mt-4">
            <button
              onClick={() => setShowMockResult(true)}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-98 transition-transform"
            >
              <Eye size={18} /> 결과 예시 보기
            </button>
          </div>

          {isAllFilled ? (
            <div className="mx-4 mt-4 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-3xl p-6 flex flex-col items-center justify-center shadow-xl shadow-indigo-200 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl" />
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-3 backdrop-blur-sm shadow-inner">
                <Check size={24} className="text-white" strokeWidth={3} />
              </div>
              <h3 className="font-black text-xl mb-1 tracking-tight">100% 달성 완료! 🎉</h3>
              <p className="text-xs text-indigo-100 mb-5 font-medium">오늘의 모든 기록이 채워졌습니다.</p>
              <button
                onClick={() => {
                  setShowArchiveToast(true);
                  setTimeout(() => {
                    setShowArchiveToast(false);
                    setSelectedGroup(null);
                  }, 1500);
                }}
                className="w-full py-3.5 bg-white text-indigo-600 rounded-2xl font-black shadow-lg hover:bg-indigo-50 transition-colors active:scale-95 mb-3 flex items-center justify-center gap-2"
              >
                <FolderClock size={18} /> 보관함으로 옮기기
              </button>
              <p className="text-[10px] text-indigo-200 font-medium">2일 뒤 보관함으로 자동 이동됩니다</p>
            </div>
          ) : (
            <div className="mx-4 mt-4 bg-[#1A1A1A] text-white rounded-3xl p-5 flex items-center justify-between shadow-xl shadow-gray-200 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full -mr-10 -mt-10 blur-xl" />
              <div className="relative z-10">
                <div className="text-xs text-gray-400 mb-1 font-medium">진행률</div>
                <div className="text-3xl font-mono font-bold text-yellow-400 tracking-tighter">
                  {progressPercent}%
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center border border-white/5 backdrop-blur relative z-10">
                <Clock size={24} className="text-yellow-400" />
              </div>
            </div>
          )}

          {/* Slots */}
          <div className="p-4 grid grid-cols-2 gap-3">
            {slotsLoading
              ? Array(4).fill(0).map((_, i) => (
                  <div key={i} className="h-36 bg-gray-100 rounded-2xl animate-pulse" />
                ))
              : slots.map((slot, idx) => (
                  <div
                    key={slot.id}
                    className="border border-gray-200 rounded-2xl p-4 flex flex-col justify-between h-36 relative overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start z-10">
                      <select
                        value={slot.scheduledTime}
                        onChange={(e) => handleTimeChange(slot.id, e.target.value, idx)}
                        className="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded-md text-gray-500 font-mono tracking-tight text-center focus:ring-2 focus:ring-blue-500 outline-none transition-all border border-transparent focus:bg-white cursor-pointer"
                      >
                        {TIME_OPTIONS.map((time) => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                      {slot.status === "FILLED" && (
                        <div className="bg-green-100 p-1 rounded-full">
                          <Check size={10} className="text-green-600" strokeWidth={3} />
                        </div>
                      )}
                    </div>

                    {slot.status === "FILLED" && (
                      <div className="absolute inset-0 bg-blue-500 opacity-10" />
                    )}

                    {slot.status !== "FILLED" && (
                      <div className="flex flex-col items-center justify-center flex-1 mt-2 z-10">
                        <button
                          onClick={() => handleSlotClick(slot.id)}
                          disabled={uploadingSlotId !== null}
                          className="w-10 h-10 rounded-full bg-gray-50 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 mb-2 hover:bg-black hover:text-white hover:border-black transition-all group disabled:opacity-50"
                        >
                          {uploadingSlotId === slot.id ? (
                            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Camera size={18} className="group-hover:scale-110 transition-transform" />
                          )}
                        </button>
                      </div>
                    )}

                    {slot.assetUrl && (
                      <div className="absolute inset-0">
                        <img src={slot.assetUrl} alt="slot" className="w-full h-full object-cover opacity-60 rounded-2xl" />
                      </div>
                    )}

                    <div className="z-10 mt-auto flex flex-col w-full">
                      <span className={`font-bold text-base leading-tight ${slot.status === "FILLED" ? "text-gray-900" : "text-gray-600 text-center"}`}>
                        {slot.label || slot.scheduledTime}
                      </span>
                      {slot.userName && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="w-5 h-5 rounded-full bg-gray-900 text-white flex items-center justify-center text-[10px] font-bold">
                            {slot.userName?.[0] ?? "?"}
                          </div>
                          <p className="text-xs text-gray-500 font-medium">{slot.userName}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            <button
              onClick={handleAddSlot}
              disabled={createSlot.isPending}
              className="border-2 border-dashed border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center h-36 text-gray-400 hover:bg-gray-50 hover:text-gray-600 hover:border-gray-300 transition-all active:scale-95 group disabled:opacity-50"
            >
              <div className="w-10 h-10 rounded-full bg-gray-50 group-hover:bg-white border border-transparent group-hover:border-gray-200 flex items-center justify-center mb-2 transition-all">
                {createSlot.isPending ? (
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Plus size={20} />
                )}
              </div>
              <span className="text-[10px] font-bold">시간 추가하기</span>
            </button>
          </div>
        </div>
      ) : (
        /* Chat Tab */
        <div className="flex flex-col h-full bg-gray-50 animate-fade-in pb-16 relative">
          <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20" ref={scrollRef}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.isSystem ? "items-center !my-4" : ""}`}
              >
                {msg.isSystem ? (
                  <span className="text-[10px] bg-gray-200 text-gray-500 px-3 py-1 rounded-full">
                    {msg.content}
                  </span>
                ) : (
                  <>
                    <span className="text-[10px] text-gray-500 ml-1 mb-1">{msg.userName}</span>
                    <div className="max-w-[75%] p-3 rounded-2xl text-sm shadow-sm bg-white border border-gray-100 rounded-tl-none text-gray-800">
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 mx-1">
                      {new Date(msg.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false })}
                    </span>
                  </>
                )}
              </div>
            ))}
            {messages.length === 0 && (
              <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
                아직 메시지가 없어요. 먼저 인사해보세요!
              </div>
            )}
          </div>
          <div className="p-3 bg-white border-t border-gray-100 flex items-center gap-2 absolute bottom-0 left-0 right-0 w-full z-20 safe-area-bottom">
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
              disabled={!chatInput.trim() || sendMessage.isPending}
              className={`p-2.5 rounded-full transition-colors ${chatInput.trim() ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-400"}`}
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
