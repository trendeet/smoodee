"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Play,
  X,
  Pencil,
  Film,
  Download,
  Trash2,
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
import { renderService } from "@/lib/api/renderService";
import { useApp } from "@/lib/context/AppContext";
import { useAuth } from "@/lib/context/AuthContext";
import { timeToMinutes } from "@/lib/utils/time";
import { TIME_OPTIONS } from "@/lib/mock-data/messages";

const GroupScreen = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selectedGroup, setSelectedGroup } = useApp();
  const { userProfile } = useAuth();

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

  const messages = chatPage ?? [];

  // ── Mutations ────────────────────────────────────────────────────────────
  const createSlot = useMutation({
    mutationFn: (timeLabel: string) =>
      slotService.createSlot(groupId!, { timeLabel }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["group", groupId, "slots"] }),
  });

  const updateSlot = useMutation({
    mutationFn: ({ slotId, body }: { slotId: number; body: { timeLabel?: string } }) =>
      slotService.updateSlot(groupId!, slotId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["group", groupId, "slots"] }),
  });

  const sendMessage = useMutation({
    mutationFn: (body: string) => chatService.sendMessage(groupId!, { body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["group", groupId, "chat"] }),
  });

  // ── Local UI state ───────────────────────────────────────────────────────
  const [showInviteToast, setShowInviteToast] = useState(false);
  const [showArchiveToast, setShowArchiveToast] = useState(false);
  const [showTimeOrderToast, setShowTimeOrderToast] = useState(false);
  const searchParams = useSearchParams();
  const [activeSubTab, setActiveSubTab] = useState(
    searchParams.get("tab") === "chat" ? "chat" : "status"
  );
  const [chatInput, setChatInput] = useState("");
  const [lastSeenMsgId, setLastSeenMsgId] = useState<number>(() => {
    if (typeof window === "undefined" || !groupId) return 0;
    return Number(localStorage.getItem(`chat_seen_${groupId}`) ?? 0);
  });
  const [showMockResult, setShowMockResult] = useState(false);
  const [uploadingSlotId, setUploadingSlotId] = useState<number | null>(null);
  const [slotAssets, setSlotAssets] = useState<Record<number, { url: string; thumbnailUrl: string; isVideo: boolean }>>({});
  const [slotCaptions, setSlotCaptions] = useState<Record<number, string>>({});
  const [playingAsset, setPlayingAsset] = useState<{ url: string; isVideo: boolean } | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{
    type: "deleteSlot" | "deleteUpload";
    slotId: number;
  } | null>(null);

  const [pendingReplace, setPendingReplace] = useState<{
    slotId: number;
    file: File;
    localUrl: string;
    thumbnailUrl: string;
    isVideo: boolean;
  } | null>(null);

  const [renderJobId, setRenderJobId] = useState<number | null>(null);
  const [renderStatus, setRenderStatus] = useState<string | null>(null);
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const renderPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const pendingSlotId = useRef<number | null>(null);

  useEffect(() => {
    if (slots.length === 0) return;
    const fromServer: Record<number, { url: string; thumbnailUrl: string; isVideo: boolean }> = {};
    const captionsFromServer: Record<number, string> = {};
    slots.forEach((slot) => {
      if (slot.assetUrl) {
        const isVideo = slot.assetMime?.startsWith("video/") ?? false;
        fromServer[slot.id] = { url: slot.assetUrl, thumbnailUrl: slot.assetUrl, isVideo };
      }
      if (slot.caption) {
        captionsFromServer[slot.id] = slot.caption;
      }
    });
    setSlotAssets((prev) => {
      const next: typeof prev = {};
      Object.entries(fromServer).forEach(([key, serverAsset]) => {
        const id = Number(key);
        const existing = prev[id];
        next[id] = {
          ...serverAsset,
          // 업로드 직후 로컬에서 캡처한 canvas 썸네일(data: URL)은 보존
          thumbnailUrl: existing?.thumbnailUrl?.startsWith("data:")
            ? existing.thumbnailUrl
            : serverAsset.thumbnailUrl,
        };
      });
      return next;
    });
    setSlotCaptions((prev) => ({ ...captionsFromServer, ...prev }));
  }, [slots]);

  useEffect(() => {
    return () => {
      if (renderPollRef.current) clearTimeout(renderPollRef.current);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeSubTab]);

  useEffect(() => {
    if (activeSubTab === "chat" && messages.length > 0) {
      const latestId = messages[0].id;
      setLastSeenMsgId(latestId);
      localStorage.setItem(`chat_seen_${groupId}`, String(latestId));
    }
  }, [activeSubTab, messages, groupId]);

  const hasUnread =
    messages.length > 0 &&
    messages[0].id > lastSeenMsgId &&
    messages[0].userId !== userProfile?.id;

  if (!selectedGroup) return null;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleInvite = () => {
    const code = group?.inviteCode;
    if (code && navigator.clipboard) navigator.clipboard.writeText(code).catch(() => {});
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
      const lastMins = timeToMinutes(lastSlot.timeLabel);
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
      if (timeToMinutes(slots[currentIndex - 1].timeLabel) >= newMins) isValid = false;
    }
    if (currentIndex < slots.length - 1) {
      if (timeToMinutes(slots[currentIndex + 1].timeLabel) <= newMins) isValid = false;
    }
    if (!isValid) {
      setShowTimeOrderToast(true);
      setTimeout(() => setShowTimeOrderToast(false), 2000);
      return;
    }
    updateSlot.mutate({ slotId, body: { timeLabel: newTime } });
  };

  const handleSlotClick = (slotId: number) => {
    pendingSlotId.current = slotId;
    fileInputRef.current?.click();
  };

  const captureVideoThumbnail = (videoUrl: string): Promise<string> =>
    new Promise((resolve) => {
      const video = document.createElement("video");
      video.src = videoUrl;
      video.muted = true;
      video.playsInline = true;
      video.currentTime = 0.5;
      video.addEventListener("seeked", () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;
        canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
        video.remove();
      }, { once: true });
      video.load();
    });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const slotId = pendingSlotId.current;
    if (!file || slotId === null || groupId === null) return;
    e.target.value = "";
    pendingSlotId.current = null;
    setUploadingSlotId(slotId);
    const isVideo = file.type.startsWith("video/");
    const localUrl = URL.createObjectURL(file);
    try {
      const [asset, thumbnailUrl] = await Promise.all([
        assetService.uploadAsset(selectedGroup.projectId ?? groupId, file),
        isVideo ? captureVideoThumbnail(localUrl) : Promise.resolve(localUrl),
      ]);
      await slotService.bindUpload(groupId, slotId, asset.id);
      setSlotAssets((prev) => ({
        ...prev,
        [slotId]: { url: asset.url ?? localUrl, thumbnailUrl, isVideo },
      }));
      queryClient.invalidateQueries({ queryKey: ["group", groupId, "slots"] });
      queryClient.invalidateQueries({ queryKey: ["group", groupId, "progress"] });
    } finally {
      setUploadingSlotId(null);
    }
  };

  const handleReplaceFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const slotId = pendingSlotId.current;
    if (!file || slotId === null) return;
    e.target.value = "";
    pendingSlotId.current = null;
    const isVideo = file.type.startsWith("video/");
    const localUrl = URL.createObjectURL(file);
    const thumbnailUrl = isVideo ? await captureVideoThumbnail(localUrl) : localUrl;
    setPendingReplace({ slotId, file, localUrl, thumbnailUrl, isVideo });
  };

  const handleReplaceConfirm = async () => {
    if (!pendingReplace || uploadingSlotId !== null) return;
    const { slotId, file, localUrl, thumbnailUrl, isVideo } = pendingReplace;
    setPendingReplace(null);
    setUploadingSlotId(slotId);
    try {
      const asset = await assetService.uploadAsset(selectedGroup.projectId ?? groupId!, file);
      await slotService.bindUpload(groupId!, slotId, asset.id);
      setSlotAssets((prev) => ({ ...prev, [slotId]: { url: asset.url ?? localUrl, thumbnailUrl, isVideo } }));
      queryClient.invalidateQueries({ queryKey: ["group", groupId, "slots"] });
      queryClient.invalidateQueries({ queryKey: ["group", groupId, "progress"] });
    } finally {
      setUploadingSlotId(null);
    }
  };

  const handleDeleteSlot = async (slotId: number) => {
    if (!groupId) return;
    await slotService.deleteSlot(groupId, slotId);
    setSlotAssets((prev) => { const next = { ...prev }; delete next[slotId]; return next; });
    setSlotCaptions((prev) => { const next = { ...prev }; delete next[slotId]; return next; });
    queryClient.invalidateQueries({ queryKey: ["group", groupId, "slots"] });
    queryClient.invalidateQueries({ queryKey: ["group", groupId, "progress"] });
  };

  const handleDeleteUpload = async (slotId: number) => {
    if (!groupId || uploadingSlotId !== null) return;
    setUploadingSlotId(slotId);
    try {
      await slotService.deleteUpload(groupId, slotId);
      setSlotAssets((prev) => {
        const next = { ...prev };
        delete next[slotId];
        return next;
      });
      setSlotCaptions((prev) => {
        const next = { ...prev };
        delete next[slotId];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["group", groupId, "slots"] });
      queryClient.invalidateQueries({ queryKey: ["group", groupId, "progress"] });
    } finally {
      setUploadingSlotId(null);
    }
  };

  const handleCreateResult = async () => {
    if (!groupId || renderStatus === "QUEUED" || renderStatus === "RUNNING") return;
    setRenderStatus("QUEUED");
    setResultVideoUrl(null);
    try {
      const job = await renderService.submitGroup(groupId);
      setRenderJobId(job.id);
      setRenderStatus(job.status);
      const poll = async (id: number) => {
        try {
          const updated = await renderService.getRenderJob(id);
          setRenderStatus(updated.status);
          if (updated.status === "SUCCEEDED") {
            const url = await renderService.getDownloadUrl(id);
            setResultVideoUrl(url);
            setShowResultModal(true);
          } else if (updated.status === "FAILED") {
            // stop polling
          } else {
            renderPollRef.current = setTimeout(() => poll(id), 3000);
          }
        } catch {
          setRenderStatus("FAILED");
        }
      };
      poll(job.id);
    } catch {
      setRenderStatus("FAILED");
    }
  };

  // 전체 그룹 진행률: 멤버 수 × 슬롯 수 기준
  // matrix: { [slotId]: { [userId]: "UPLOADED" | "MISSING" } }
  const totalCells =
    (progress?.slots?.length ?? slots.length) *
    (progress?.memberUserIds?.length ?? (members.length || (group?.memberCount ?? 1)));
  const filledCells = progress?.matrix
    ? Object.values(progress.matrix).reduce(
        (sum, row) =>
          sum + (row ? Object.values(row).filter((s) => s === "UPLOADED").length : 0),
        0
      )
    : 0;
  const groupProgressPercent =
    totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0;
  const isAllFilled = groupProgressPercent === 100;
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
      <input
        ref={replaceInputRef}
        type="file"
        accept="video/*,image/*"
        className="hidden"
        onChange={handleReplaceFileSelect}
      />
      <MockResultModal
        isOpen={showMockResult}
        onClose={() => setShowMockResult(false)}
        memberCount={memberCount}
        slots={[]}
      />

      {/* 삭제 확인 바텀시트 */}
      {pendingConfirm && (
        <div
          className="absolute inset-0 z-[150] bg-black/50 backdrop-blur-sm flex items-center justify-center px-6"
          onClick={() => setPendingConfirm(null)}
        >
          <div
            className="bg-white w-full rounded-3xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
                {pendingConfirm.type === "deleteSlot"
                  ? <X size={24} className="text-red-400" />
                  : <Trash2 size={24} className="text-red-400" />}
              </div>
              <h2 className="text-xl font-black text-gray-900">
                {pendingConfirm.type === "deleteSlot" ? "타임슬롯을 삭제할까요?" : "영상을 삭제할까요?"}
              </h2>
              <p className="text-sm text-gray-500 font-medium mt-2">
                {pendingConfirm.type === "deleteSlot"
                  ? "이 타임슬롯과 업로드된 영상이 함께 삭제됩니다."
                  : "업로드된 영상만 삭제되고 슬롯은 유지됩니다."}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingConfirm(null)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-2xl text-sm font-bold"
              >
                취소
              </button>
              <button
                onClick={() => {
                  const { type, slotId } = pendingConfirm;
                  setPendingConfirm(null);
                  if (type === "deleteSlot") handleDeleteSlot(slotId);
                  else handleDeleteUpload(slotId);
                }}
                className="flex-1 py-3 bg-red-500 text-white rounded-2xl text-sm font-bold"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 교체 미리보기 바텀시트 */}
      {pendingReplace && (
        <div className="absolute inset-0 z-[150] bg-black/60 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-5 pb-safe" onClick={(e) => e.stopPropagation()}>
            <div className="w-full aspect-video rounded-xl overflow-hidden bg-black mb-4">
              {pendingReplace.isVideo ? (
                <video src={pendingReplace.localUrl} className="w-full h-full object-cover" autoPlay muted playsInline />
              ) : (
                <img src={pendingReplace.thumbnailUrl} alt="preview" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingReplace(null)}
                className="flex-1 py-3 bg-gray-100 rounded-2xl text-sm font-bold text-gray-700"
              >
                취소
              </button>
              <button
                onClick={handleReplaceConfirm}
                disabled={uploadingSlotId !== null}
                className="flex-1 py-3 bg-black text-white rounded-2xl text-sm font-bold disabled:opacity-50"
              >
                {uploadingSlotId !== null ? "업로드 중..." : "적용"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 영상/이미지 재생 모달 */}
      {playingAsset && (
        <div
          className="absolute inset-0 z-[200] bg-black flex items-center justify-center"
          onClick={() => setPlayingAsset(null)}
        >
          <button
            className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white"
            onClick={() => setPlayingAsset(null)}
          >
            <X size={20} />
          </button>
          {playingAsset.isVideo ? (
            <video
              src={playingAsset.url}
              className="w-full max-h-full"
              autoPlay
              muted
              playsInline
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={playingAsset.url}
              alt="preview"
              className="w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}

      {/* 결과 영상 모달 */}
      {showResultModal && resultVideoUrl && (
        <div className="absolute inset-0 z-[250] bg-black flex flex-col">
          <div className="flex items-center justify-between px-4 py-4 shrink-0">
            <h2 className="text-white font-bold text-base">하루공유 결과</h2>
            <button
              onClick={() => setShowResultModal(false)}
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <video
              src={resultVideoUrl}
              className="w-full max-h-full object-contain"
              autoPlay
              muted
              playsInline
              controls
            />
          </div>
          <div className="px-4 py-4 flex gap-3 shrink-0">
            <button
              onClick={async () => {
                if (!resultVideoUrl) return;
                try {
                  const res = await fetch(resultVideoUrl);
                  const blob = await res.blob();
                  const fileName = `dayshare-result.mp4`;
                  const file = new File([blob], fileName, { type: "video/mp4" });
                  if (navigator.canShare?.({ files: [file] })) {
                    await navigator.share({ files: [file], title: "하루공유 결과" });
                  } else {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = fileName;
                    a.click();
                    URL.revokeObjectURL(url);
                  }
                } catch {
                  // fallback: 링크 공유
                  if (renderJobId) {
                    const shareUrl = await renderService.getShareUrl(renderJobId);
                    navigator.clipboard?.writeText(shareUrl).catch(() => {});
                  }
                }
              }}
              className="flex-1 py-3 bg-white text-black rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
            >
              <Share2 size={16} /> 공유하기
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-4 py-4 bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => {
              setSelectedGroup(null);
              if (selectedGroup?.source === "home") router.push("/");
              else router.push("/inprogress?tab=group");
            }}
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
              ? members.map((member) => {
                  const isMe = member.userId === userProfile?.id;
                  const avatarSrc = isMe ? userProfile?.avatar : member.avatarUrl;
                  const isImage = avatarSrc?.startsWith("http") || avatarSrc?.startsWith("data:");
                  return (
                    <div key={member.userId} className="flex flex-col items-center gap-1 min-w-[50px]">
                      {isImage ? (
                        <img src={avatarSrc} alt={member.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white shadow-sm">
                          {member.name?.[0] ?? "?"}
                        </div>
                      )}
                      <span className="text-[10px] font-medium text-gray-600 truncate max-w-[50px]">
                        {isMe ? "나" : member.name}
                      </span>
                    </div>
                  );
                })
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
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 relative ${activeSubTab === "chat" ? "bg-black text-white" : "bg-gray-100 text-gray-500"}`}
          >
            <MessageCircle size={14} /> 채팅
            {hasUnread && activeSubTab !== "chat" && (
              <span className="absolute top-1 right-3 w-2 h-2 bg-red-500 rounded-full" />
            )}
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

          <div className="px-4 mt-4 flex gap-2">
            <button
              onClick={() => setShowMockResult(true)}
              className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-98 transition-transform"
            >
              <Eye size={16} /> 예시 보기
            </button>
            <button
              onClick={renderStatus === "SUCCEEDED" && resultVideoUrl ? () => setShowResultModal(true) : handleCreateResult}
              disabled={
                renderStatus === "QUEUED" ||
                renderStatus === "RUNNING" ||
                (!isAllFilled && renderStatus !== "SUCCEEDED")
              }
              className={`flex-1 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95
                ${isAllFilled || renderStatus === "SUCCEEDED"
                  ? "bg-black text-white shadow-lg"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }
                ${renderStatus === "QUEUED" || renderStatus === "RUNNING" ? "opacity-70" : ""}
              `}
            >
              {renderStatus === "QUEUED" || renderStatus === "RUNNING" ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  렌더링 중
                </>
              ) : renderStatus === "SUCCEEDED" && resultVideoUrl ? (
                <>
                  <Film size={16} /> 결과 보기
                </>
              ) : (
                <>
                  <Film size={16} /> 결과 만들기
                </>
              )}
            </button>
          </div>

          {/* 전체 진행률 카드 */}
          <div className="mx-4 mt-4 bg-[#1A1A1A] text-white rounded-3xl p-5 overflow-hidden relative shadow-xl shadow-gray-200">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full -mr-10 -mt-10 blur-xl" />
            <div className="relative z-10 flex items-center justify-between mb-3">
              <div>
                <div className="text-xs text-gray-400 font-medium mb-0.5">전체 진행률</div>
                <div className="text-3xl font-mono font-bold text-yellow-400 tracking-tighter">
                  {groupProgressPercent}%
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400 font-medium mb-0.5">업로드</div>
                <div className="text-sm font-bold text-gray-200">
                  {filledCells} <span className="text-gray-500 font-normal">/ {totalCells}</span>
                </div>
              </div>
            </div>
            {/* 프로그레스 바 */}
            <div className="relative z-10 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${groupProgressPercent}%`,
                  background: isAllFilled
                    ? "linear-gradient(90deg, #6366f1, #a855f7)"
                    : "linear-gradient(90deg, #facc15, #f97316)",
                }}
              />
            </div>
            {isAllFilled && (
              <div className="relative z-10 mt-4 flex flex-col items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-medium">
                  <Check size={12} strokeWidth={3} /> 모든 멤버의 기록이 완성됐어요!
                </div>
                <button
                  onClick={() => {
                    setShowArchiveToast(true);
                    setTimeout(() => {
                      setShowArchiveToast(false);
                      setSelectedGroup(null);
                    }, 1500);
                  }}
                  className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <FolderClock size={14} /> 보관함으로 옮기기
                </button>
              </div>
            )}
          </div>

          {/* Slots */}
          <div className="p-4 grid grid-cols-2 gap-3">
            {slotsLoading
              ? Array(4).fill(0).map((_, i) => (
                  <div key={i} className="h-36 bg-gray-100 rounded-2xl animate-pulse" />
                ))
              : slots.map((slot, idx) => {
                  const uploaded = slotAssets[slot.id];
                  const isFilled = !!uploaded;
                  return (
                    <div key={slot.id} className="flex flex-col gap-1.5">
                    <div
                      className="border border-gray-200 rounded-2xl flex flex-col justify-between h-36 relative overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
                    >
                      {/* 썸네일 */}
                      {uploaded && (
                        <div
                          className="absolute inset-0 cursor-pointer"
                          onClick={() => setPlayingAsset(uploaded)}
                        >
                          {uploaded.isVideo && !uploaded.thumbnailUrl.startsWith("data:") ? (
                            <video
                              src={uploaded.url}
                              className="w-full h-full object-cover pointer-events-none"
                              muted
                              playsInline
                              preload="metadata"
                              onLoadedMetadata={(e) => {
                                (e.target as HTMLVideoElement).currentTime = 0.5;
                              }}
                            />
                          ) : (
                            <img
                              src={uploaded.thumbnailUrl}
                              alt="slot"
                              className="w-full h-full object-cover"
                            />
                          )}
                          <div className="absolute inset-0 bg-black/20" />
                          {uploaded.isVideo && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center shadow-lg">
                                <Play size={18} className="text-gray-900 ml-0.5" fill="currentColor" />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 교체 / 삭제 버튼 (채워진 슬롯) */}
                      {uploaded && (
                        <div className="absolute bottom-2 right-2 z-20 flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              pendingSlotId.current = slot.id;
                              replaceInputRef.current?.click();
                            }}
                            disabled={uploadingSlotId !== null}
                            className="w-7 h-7 rounded-full bg-black/60 flex items-center justify-center disabled:opacity-50"
                          >
                            <Camera size={13} className="text-white" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingConfirm({ type: "deleteUpload", slotId: slot.id });
                            }}
                            disabled={uploadingSlotId !== null}
                            className="w-7 h-7 rounded-full bg-red-500/80 flex items-center justify-center disabled:opacity-50"
                          >
                            <Trash2 size={11} className="text-white" />
                          </button>
                        </div>
                      )}

                      <div className="flex justify-between items-start z-10 p-3">
                        <select
                          value={slot.timeLabel}
                          onChange={(e) => handleTimeChange(slot.id, e.target.value, idx)}
                          className="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded-md text-gray-500 font-mono tracking-tight text-center focus:ring-2 focus:ring-blue-500 outline-none transition-all border border-transparent focus:bg-white cursor-pointer"
                          style={{ backdropFilter: "blur(4px)" }}
                        >
                          {TIME_OPTIONS.map((time) => (
                            <option key={time} value={time}>{time}</option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1">
                          {isFilled && (
                            <div className="bg-green-100 p-1 rounded-full">
                              <Check size={10} className="text-green-600" strokeWidth={3} />
                            </div>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); setPendingConfirm({ type: "deleteSlot", slotId: slot.id }); }}
                            className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors
                              ${isFilled ? "bg-white/20 text-white" : "bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-500"}`}
                          >
                            <X size={10} />
                          </button>
                        </div>
                      </div>

                      {!isFilled && (
                        <div className="flex flex-col items-center justify-center flex-1 z-10">
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

                      <div className="z-10 p-3 pt-0">
                        <span className={`font-bold text-sm leading-tight ${isFilled ? "text-white drop-shadow" : "text-gray-600"}`}>
                          {slot.timeLabel}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-gray-50 border border-transparent focus-within:border-gray-200 focus-within:bg-white transition-all group">
                      <Pencil size={10} className="text-gray-300 group-focus-within:text-gray-400 shrink-0 transition-colors" />
                      <input
                        value={slotCaptions[slot.id] ?? ""}
                        onChange={(e) =>
                          setSlotCaptions((prev) => ({ ...prev, [slot.id]: e.target.value }))
                        }
                        onBlur={(e) => {
                          if (groupId) slotService.updateCaption(groupId, slot.id, e.target.value);
                        }}
                        placeholder="텍스트 추가..."
                        maxLength={100}
                        className="flex-1 min-w-0 text-[11px] text-gray-600 bg-transparent outline-none placeholder-gray-300"
                      />
                      {slotCaptions[slot.id] && (
                        <span className="text-[9px] text-gray-300 shrink-0 font-mono tabular-nums">
                          {slotCaptions[slot.id].length}/100
                        </span>
                      )}
                    </div>
                    </div>
                  );
                })}
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
          <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-20" ref={scrollRef}>
            {[...messages].reverse().map((msg) => {
              const isMine = msg.userId === userProfile?.id;
              const timeStr = new Date(msg.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
              if (msg.isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center my-3">
                    <span className="text-[10px] bg-gray-200 text-gray-500 px-3 py-1 rounded-full">
                      {msg.body}
                    </span>
                  </div>
                );
              }
              return (
                <div key={msg.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                  {!isMine && (
                    <span className="text-[10px] text-gray-500 ml-1 mb-1">{msg.userName}</span>
                  )}
                  <div className={`flex items-end gap-1.5 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`max-w-[70vw] px-3.5 py-2.5 text-sm leading-snug shadow-sm
                      ${isMine
                        ? "bg-[#1A1A1A] text-white rounded-2xl rounded-br-sm"
                        : "bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-bl-sm"
                      }`}
                    >
                      {msg.body}
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0 pb-0.5">{timeStr}</span>
                  </div>
                </div>
              );
            })}
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
