"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

// Safari는 currentTime 설정 후 seeked 이벤트 없이 프레임을 렌더링하지 않음.
// canvas로 캡처해 <img>로 교체하면 모든 브라우저에서 안정적으로 썸네일 표시.
function VideoThumbnail({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const [thumb, setThumb] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL("image/jpeg", 0.85);
      if (url && url !== "data:,") setThumb(url);
    } catch {
      // CORS 제한 등으로 캡처 불가 → <video> 유지
    }
  }, []);

  if (thumb) {
    return <img src={thumb} alt="" className={className} />;
  }

  return (
    <video
      ref={videoRef}
      src={src}
      className={className}
      muted
      playsInline
      preload="metadata"
      crossOrigin="anonymous"
      onLoadedMetadata={(e) => {
        (e.target as HTMLVideoElement).currentTime = 0.001;
      }}
      onSeeked={capture}
    />
  );
}
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
  MoreHorizontal,
  Sparkles,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import StatusBar from "@/components/ui/StatusBar";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";
import ScrollTimePicker from "./ScrollTimePicker";
import { groupService } from "@/lib/api/groupService";
import { slotService } from "@/lib/api/slotService";
import { chatService } from "@/lib/api/chatService";
import { assetService } from "@/lib/api/assetService";
import { renderService } from "@/lib/api/renderService";
import { useApp } from "@/lib/context/AppContext";
import { useAuth } from "@/lib/context/AuthContext";
import { timeToMinutes } from "@/lib/utils/time";

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
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["group", groupId, "slots"] }),
  });

  const updateSlot = useMutation({
    mutationFn: ({
      slotId,
      body,
    }: {
      slotId: number;
      body: { timeLabel?: string };
    }) => slotService.updateSlot(groupId!, slotId, body),
    onSuccess: (_, { slotId, body }) => {
      if (body.timeLabel !== undefined) {
        // timeLabel만 변경할 경우 캐시 직접 업데이트 (presigned URL 재발급 방지)
        queryClient.setQueryData(["group", groupId, "slots"], (old: any) =>
          Array.isArray(old)
            ? old.map((s: any) =>
                s.id === slotId ? { ...s, timeLabel: body.timeLabel } : s
              )
            : old
        );
      } else {
        queryClient.invalidateQueries({
          queryKey: ["group", groupId, "slots"],
        });
      }
    },
  });

  const sendMessage = useMutation({
    mutationFn: (body: string) => chatService.sendMessage(groupId!, { body }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["group", groupId, "chat"] }),
  });

  // ── Local UI state ───────────────────────────────────────────────────────
  const [showInviteToast, setShowInviteToast] = useState(false);
  const [showArchiveToast, setShowArchiveToast] = useState(false);
  const searchParams = useSearchParams();
  const [activeSubTab, setActiveSubTab] = useState(
    searchParams.get("tab") === "chat" ? "chat" : "status"
  );
  const [chatInput, setChatInput] = useState("");
  const isComposingRef = useRef(false);
  const [lastSeenMsgId, setLastSeenMsgId] = useState<number>(() => {
    if (typeof window === "undefined" || !groupId) return 0;
    return Number(localStorage.getItem(`chat_seen_${groupId}`) ?? 0);
  });
  const [showAllProgress, setShowAllProgress] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingSlotId, setUploadingSlotId] = useState<number | null>(null);
  const [slotAssets, setSlotAssets] = useState<
    Record<number, { url: string; thumbnailUrl: string; isVideo: boolean }>
  >({});
  const [slotCaptions, setSlotCaptions] = useState<Record<number, string>>({});
  const [playingAsset, setPlayingAsset] = useState<{
    url: string;
    isVideo: boolean;
  } | null>(null);
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

  const [showTimePickerSlotId, setShowTimePickerSlotId] = useState<
    number | null
  >(null);
  const [actionSheetSlotId, setActionSheetSlotId] = useState<number | null>(
    null
  );
  const [showDuplicateTimeToast, setShowDuplicateTimeToast] = useState(false);
  const [showUploadRequiredToast, setShowUploadRequiredToast] = useState(false);
  const [renderJobId, setRenderJobId] = useState<number | null>(null);
  const [renderStatus, setRenderStatus] = useState<string | null>(null);
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const renderPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const pendingSlotId = useRef<number | null>(null);

  useEffect(() => {
    if (slots.length === 0) return;
    const fromServer: Record<
      number,
      { url: string; thumbnailUrl: string; isVideo: boolean }
    > = {};
    const captionsFromServer: Record<number, string> = {};
    slots.forEach((slot) => {
      if (slot.assetUrl) {
        const isVideo = slot.assetMime?.startsWith("video/") ?? false;
        fromServer[slot.id] = {
          url: slot.assetUrl,
          thumbnailUrl: slot.assetUrl,
          isVideo,
        };
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

  // 새로고침 후에도 기존 렌더 결과 복원
  useEffect(() => {
    const projectId = selectedGroup?.projectId;
    if (!projectId) return;
    renderService
      .getLatestJobByProject(projectId)
      .then((job) => {
        if (!job) return;
        setRenderJobId(job.id);
        setRenderStatus(job.status);
        if (job.status === "SUCCEEDED" && job.resultUrl) {
          setResultVideoUrl(job.resultUrl);
        }
      })
      .catch(() => {
        // 렌더 이력 없으면 무시
      });
  }, [selectedGroup?.projectId]);

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

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !groupId) return;
    setUploadingCover(true);
    try {
      await groupService.uploadCoverImage(groupId, file);
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
    } finally {
      setUploadingCover(false);
      e.target.value = "";
    }
  };

  const handleInvite = () => {
    const code = group?.inviteCode;
    if (code && navigator.clipboard)
      navigator.clipboard.writeText(code).catch(() => {});
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
      newTime = `${h.toString().padStart(2, "0")}:${m
        .toString()
        .padStart(2, "0")}`;
    }
    createSlot.mutate(newTime);
  };

  const handleTimeChange = (slotId: number, newTime: string) => {
    const isDuplicate = slots.some(
      (s) => s.id !== slotId && s.timeLabel === newTime
    );
    if (isDuplicate) {
      setShowDuplicateTimeToast(true);
      setTimeout(() => setShowDuplicateTimeToast(false), 2000);
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
      video.addEventListener(
        "seeked",
        () => {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth || 320;
          canvas.height = video.videoHeight || 240;
          canvas
            .getContext("2d")
            ?.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.8));
          video.remove();
        },
        { once: true }
      );
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
      queryClient.invalidateQueries({
        queryKey: ["group", groupId, "progress"],
      });
    } finally {
      setUploadingSlotId(null);
    }
  };

  const handleReplaceFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    const slotId = pendingSlotId.current;
    if (!file || slotId === null) return;
    e.target.value = "";
    pendingSlotId.current = null;
    const isVideo = file.type.startsWith("video/");
    const localUrl = URL.createObjectURL(file);
    const thumbnailUrl = isVideo
      ? await captureVideoThumbnail(localUrl)
      : localUrl;
    setPendingReplace({ slotId, file, localUrl, thumbnailUrl, isVideo });
  };

  const handleReplaceConfirm = async () => {
    if (!pendingReplace || uploadingSlotId !== null) return;
    const { slotId, file, localUrl, thumbnailUrl, isVideo } = pendingReplace;
    setPendingReplace(null);
    setUploadingSlotId(slotId);
    try {
      const asset = await assetService.uploadAsset(
        selectedGroup.projectId ?? groupId!,
        file
      );
      await slotService.bindUpload(groupId!, slotId, asset.id);
      setSlotAssets((prev) => ({
        ...prev,
        [slotId]: { url: asset.url ?? localUrl, thumbnailUrl, isVideo },
      }));
      queryClient.invalidateQueries({ queryKey: ["group", groupId, "slots"] });
      queryClient.invalidateQueries({
        queryKey: ["group", groupId, "progress"],
      });
    } finally {
      setUploadingSlotId(null);
    }
  };

  const handleDeleteSlot = async (slotId: number) => {
    if (!groupId) return;
    await slotService.deleteSlot(groupId, slotId);
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
      queryClient.invalidateQueries({
        queryKey: ["group", groupId, "progress"],
      });
    } finally {
      setUploadingSlotId(null);
    }
  };

  const handleCreateResult = async () => {
    if (!groupId || renderStatus === "QUEUED" || renderStatus === "RUNNING")
      return;
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
    (progress?.memberUserIds?.length ??
      (members.length || (group?.memberCount ?? 1)));
  const filledCells = progress?.matrix
    ? Object.values(progress.matrix).reduce(
        (sum, row) =>
          sum +
          (row ? Object.values(row).filter((s) => s === "UPLOADED").length : 0),
        0
      )
    : 0;
  const groupProgressPercent =
    totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0;
  const isAllFilled = groupProgressPercent === 100;
  const displayName = group?.name ?? selectedGroup.name;
  const memberCount =
    members.length > 0 ? members.length : group?.memberCount ?? 1;

  return (
    <div
      className="flex flex-col h-full pb-safe overflow-y-auto no-scrollbar animate-slide-left"
      style={{ background: "#FDFDFD" }}
    >
      <StatusBar theme="dark" />
      {showInviteToast && <Toast message="초대 코드가 복사되었습니다!" />}
      {showArchiveToast && <Toast message="보관함으로 이동되었습니다!" />}
      {showDuplicateTimeToast && (
        <Toast message="이미 사용 중인 시간이에요" type="error" />
      )}
      {showUploadRequiredToast && (
        <Toast
          message="모든 영상/이미지를 업로드해야 영상이 완성됩니다."
          type="error"
        />
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
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCoverChange}
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
                {pendingConfirm.type === "deleteSlot" ? (
                  <X size={24} className="text-red-400" />
                ) : (
                  <Trash2 size={24} className="text-red-400" />
                )}
              </div>
              <h2 className="text-xl font-black text-gray-900">
                {pendingConfirm.type === "deleteSlot"
                  ? "타임슬롯을 삭제할까요?"
                  : "영상을 삭제할까요?"}
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
          <div
            className="bg-white w-full rounded-t-3xl p-5 pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full aspect-video rounded-xl overflow-hidden bg-black mb-4">
              {pendingReplace.isVideo ? (
                <video
                  src={pendingReplace.localUrl}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={pendingReplace.thumbnailUrl}
                  alt="preview"
                  className="w-full h-full object-cover"
                />
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
                  const file = new File([blob], fileName, {
                    type: "video/mp4",
                  });
                  if (navigator.canShare?.({ files: [file] })) {
                    await navigator.share({
                      files: [file],
                      title: "하루공유 결과",
                    });
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
                    const shareUrl = await renderService.getShareUrl(
                      renderJobId
                    );
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
            <h1 className="text-xl font-bold tracking-tight truncate">
              {displayName}
            </h1>
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
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu((v) => !v)}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
            >
              <MoreHorizontal size={20} />
            </button>
            {showMoreMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowMoreMenu(false)}
                />
                <div
                  className="absolute right-0 top-full mt-1 z-40 bg-white rounded-2xl overflow-hidden min-w-[160px]"
                  style={{
                    border: "2px solid #e5e7eb",
                    boxShadow: "4px 4px 0 rgba(0,0,0,0.08)",
                  }}
                >
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      coverInputRef.current?.click();
                    }}
                    disabled={uploadingCover}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50"
                  >
                    <Camera size={16} className="text-gray-500" />
                    {uploadingCover ? "업로드 중..." : "커버 이미지 변경"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Members */}
        <div className="mb-4">
          <h3 className="text-xs font-bold text-gray-500 mb-2 px-1">
            함께하는 멤버
          </h3>
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-1">
            {members.length > 0
              ? members.map((member) => {
                  const isMe = member.userId === userProfile?.id;
                  const avatarSrc = isMe
                    ? userProfile?.avatar
                    : member.avatarUrl;
                  const isImage =
                    avatarSrc?.startsWith("http") ||
                    avatarSrc?.startsWith("data:");
                  return (
                    <div
                      key={member.userId}
                      className="flex flex-col items-center gap-1 min-w-[50px]"
                    >
                      <div className="relative">
                        {isImage ? (
                          <img
                            src={avatarSrc}
                            alt={member.name}
                            className="w-10 h-10 rounded-full object-cover"
                            style={{
                              border: "3px solid #333",
                              boxShadow: "4px 4px 0 rgba(0,0,0,0.12)",
                            }}
                          />
                        ) : (
                          <div
                            className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold"
                            style={{
                              border: "3px solid #333",
                              boxShadow: "4px 4px 0 rgba(0,0,0,0.12)",
                            }}
                          >
                            {member.name?.[0] ?? "?"}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-medium text-gray-600 truncate max-w-[50px]">
                        {isMe ? "나" : member.name}
                      </span>
                    </div>
                  );
                })
              : [...Array(memberCount)].map((_, i) => (
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
          {/* <p className="text-[10px] font-bold text-red-400 mt-2 px-1">
            * 초대 코드는 메뉴 → 진행중인 템플릿 → 그룹 창에서 입력할 수
            있습니다.
          </p> */}
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab("status")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
              activeSubTab === "status"
                ? "bg-black text-white"
                : "text-gray-500"
            }`}
            style={
              activeSubTab === "status"
                ? { boxShadow: "4px 4px 0 rgba(0,0,0,0.12)" }
                : {
                    background: "#F8FAFC",
                    border: "3px solid #333",
                    boxShadow: "4px 4px 0 rgba(0,0,0,0.12)",
                  }
            }
          >
            <Camera size={14} /> 인증 현황
          </button>
          <button
            onClick={() => setActiveSubTab("chat")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 relative ${
              activeSubTab === "chat" ? "bg-black text-white" : "text-gray-500"
            }`}
            style={
              activeSubTab === "chat"
                ? { boxShadow: "4px 4px 0 rgba(0,0,0,0.12)" }
                : {
                    background: "#F8FAFC",
                    border: "3px solid #333",
                    boxShadow: "4px 4px 0 rgba(0,0,0,0.12)",
                  }
            }
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
          <div
            className="mx-4 mt-4 rounded-2xl p-4 flex gap-3 items-center relative overflow-hidden"
            style={{
              background: "#F8FAFC",
              border: "3px solid #333",
              boxShadow: "4px 4px 0 rgba(0,0,0,0.12)",
            }}
          >
            <div
              className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "#a3e3ed", opacity: "0.7" }}
            >
              <Sparkles size={22} style={{ color: "#2ab8a0" }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-sm text-gray-900 mb-0.5">
                오늘의 미션
              </h3>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "#2ab8a0" }}
              >
                정해진 시간에 <strong>3초 영상/이미지</strong>를 넣어주세요! 📸
              </p>
            </div>
            <Film
              size={56}
              className="absolute right-3 top-1/2 -translate-y-1/2 opacity-10 text-gray-400 shrink-0"
            />
          </div>

          <div className="px-4 mt-4 flex gap-2">
            {renderJobId !== null ? (
              <>
                <button
                  onClick={() =>
                    renderStatus === "SUCCEEDED" && resultVideoUrl
                      ? setShowResultModal(true)
                      : undefined
                  }
                  disabled={renderStatus !== "SUCCEEDED" || !resultVideoUrl}
                  className={`flex-1 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95
                    ${
                      renderStatus === "SUCCEEDED" && resultVideoUrl
                        ? "bg-black text-white"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }
                  `}
                  style={
                    renderStatus === "SUCCEEDED" && resultVideoUrl
                      ? { boxShadow: "4px 4px 0 rgba(0,0,0,0.12)" }
                      : undefined
                  }
                >
                  {renderStatus === "QUEUED" || renderStatus === "RUNNING" ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      렌더링 중
                    </>
                  ) : (
                    <>
                      <Film size={16} /> 결과 보기
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    if (!isAllFilled) {
                      setShowUploadRequiredToast(true);
                      setTimeout(() => setShowUploadRequiredToast(false), 2500);
                      return;
                    }
                    handleCreateResult();
                  }}
                  className="flex-1 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 text-gray-700 transition-all active:scale-95"
                  style={{
                    background: "#F8FAFC",
                    border: "3px solid #333",
                    boxShadow: "4px 4px 0 rgba(0,0,0,0.12)",
                  }}
                >
                  <Film size={16} /> 다시 만들기
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  if (!isAllFilled) {
                    setShowUploadRequiredToast(true);
                    setTimeout(() => setShowUploadRequiredToast(false), 2500);
                    return;
                  }
                  handleCreateResult();
                }}
                className="flex-1 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 bg-black text-white shadow-lg transition-all active:scale-95"
              >
                <Film size={16} /> 결과 만들기
              </button>
            )}
          </div>

          {/* 멤버별 진행률 */}
          <div className="mx-4 mt-4">
            <p className="text-xs font-bold text-gray-400 mb-2 px-1">진행률</p>
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "#F8FAFC",
                boxShadow: "4px 4px 0 rgba(0,0,0,0.12)",
                border: "3px solid #333",
              }}
            >
              {[...members]
                .sort((a, b) =>
                  a.userId === userProfile?.id
                    ? -1
                    : b.userId === userProfile?.id
                    ? 1
                    : 0
                )
                .slice(0, showAllProgress ? undefined : 3)
                .map((member) => {
                  const totalSlots = progress?.slots?.length ?? 0;
                  const uploaded = progress?.matrix
                    ? Object.values(progress.matrix).filter(
                        (slotMap) =>
                          slotMap[String(member.userId)] === "UPLOADED"
                      ).length
                    : 0;
                  const percent =
                    totalSlots > 0 ? (uploaded / totalSlots) * 100 : 0;
                  const isMe = member.userId === userProfile?.id;
                  return (
                    <div
                      key={member.userId}
                      className="flex items-center gap-3 px-3 py-2.5"
                    >
                      {/* 왼쪽: 프로필 + 이름 */}
                      <div className="flex flex-col items-center gap-0.5 w-8 flex-shrink-0">
                        {(() => {
                          const avatarSrc = isMe
                            ? userProfile?.avatar
                            : member.avatarUrl;
                          return avatarSrc ? (
                            <img
                              src={avatarSrc}
                              alt={member.name}
                              className="w-8 h-8 rounded-lg object-cover"
                              style={{ border: "2px solid #333" }}
                            />
                          ) : (
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black"
                              style={{
                                background: "#888",
                                border: "2px solid #333",
                              }}
                            >
                              {(isMe ? userProfile?.name : member.name)?.[0] ??
                                "?"}
                            </div>
                          );
                        })()}
                        <span className="text-[9px] font-bold text-gray-500 truncate w-full text-center">
                          {isMe
                            ? "나"
                            : member.name?.length > 4
                            ? member.name.slice(0, 4) + "…"
                            : member.name}
                        </span>
                      </div>
                      {/* 오른쪽: 하트 + 바 + 카운터 */}
                      <div className="flex-1 flex items-center gap-1.5">
                        {/* 체력바 */}
                        <div className="relative flex-1 h-3 bg-white border-2 border-black rounded-full overflow-hidden">
                          <div className="absolute inset-0 flex">
                            {Array.from({ length: totalSlots }).map((_, i) => (
                              <div
                                key={i}
                                className="flex-1 border-r border-black/10 last:border-0"
                              />
                            ))}
                          </div>
                          <div
                            className="h-full transition-all duration-500 ease-out"
                            style={{
                              width: `${percent}%`,
                              background: isMe ? "#25a6c2" : "#7ccdd9",
                            }}
                          >
                            <div className="w-full h-1/2 bg-white/30" />
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-gray-400 flex-shrink-0">
                          {uploaded}
                          <span className="font-medium">/{totalSlots}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              {members.length > 3 && !showAllProgress && (
                <button
                  onClick={() => setShowAllProgress(true)}
                  className="w-full py-2.5 text-xs font-bold text-gray-400 flex items-center justify-center gap-1 border-t border-gray-100 active:bg-gray-50"
                >
                  나머지 {members.length - 3}명 더보기
                </button>
              )}
            </div>
          </div>

          {isAllFilled && (
            <div className="mx-4 mt-3 flex flex-col items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                <Check size={12} strokeWidth={3} /> 모든 멤버의 기록이
                완성됐어요!
              </div>
              <button
                onClick={() => {
                  setShowArchiveToast(true);
                  setTimeout(() => {
                    setShowArchiveToast(false);
                    setSelectedGroup(null);
                  }, 1500);
                }}
                className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
              >
                <FolderClock size={14} /> 보관함으로 옮기기
              </button>
            </div>
          )}

          {/* Slots */}
          <div className="p-4 grid grid-cols-2 gap-3">
            {slotsLoading
              ? Array(4)
                  .fill(0)
                  .map((_, i) => (
                    <div
                      key={i}
                      className="h-36 bg-gray-100 rounded-2xl animate-pulse"
                    />
                  ))
              : slots.map((slot) => {
                  const uploaded = slotAssets[slot.id];
                  const isFilled = !!uploaded;
                  return (
                    <div key={slot.id} className="flex flex-col gap-2">
                      {/* Card */}
                      <div
                        className="relative rounded-3xl overflow-hidden"
                        style={{
                          height: "144px",
                          border: "3px solid #333",
                          boxShadow: "4px 4px 0 rgba(0,0,0,0.12)",
                          background: isFilled ? undefined : "#F8FAFC",
                        }}
                      >
                        {/* 썸네일 */}
                        {uploaded && (
                          <div
                            className="absolute inset-0 cursor-pointer"
                            onClick={() => setPlayingAsset(uploaded)}
                          >
                            {uploaded.isVideo &&
                            !uploaded.thumbnailUrl.startsWith("data:") ? (
                              <VideoThumbnail
                                src={uploaded.url}
                                className="w-full h-full object-cover pointer-events-none"
                              />
                            ) : (
                              <img
                                src={uploaded.thumbnailUrl}
                                alt="slot"
                                className="w-full h-full object-cover"
                              />
                            )}
                            <div className="absolute inset-0 bg-black/10" />
                          </div>
                        )}

                        {/* 상단 바 — 시간 레이블 + 더보기/삭제 */}
                        <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-3 z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowTimePickerSlotId(slot.id);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold font-mono tracking-tight transition-all active:scale-95"
                            style={{
                              background: isFilled
                                ? "rgba(0,0,0,0.40)"
                                : "rgba(0,0,0,0.07)",
                              color: isFilled ? "#fff" : "#666",
                              backdropFilter: "blur(4px)",
                            }}
                          >
                            <Clock size={10} />
                            {slot.timeLabel}
                          </button>
                          {isFilled ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionSheetSlotId(slot.id);
                              }}
                              className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                              style={{
                                background: "rgba(0,0,0,0.35)",
                                backdropFilter: "blur(4px)",
                              }}
                            >
                              <MoreHorizontal
                                size={14}
                                className="text-white"
                              />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPendingConfirm({
                                  type: "deleteSlot",
                                  slotId: slot.id,
                                });
                              }}
                              className="w-7 h-7 rounded-full bg-black/5 flex items-center justify-center text-gray-400 active:bg-red-100 active:text-red-500 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>

                        {/* 중앙 — 플레이 버튼(채워진) or 카메라(빈) */}
                        {uploaded ? (
                          uploaded.isVideo && (
                            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-lg">
                                <Play
                                  size={22}
                                  className="text-gray-800 ml-1"
                                  fill="currentColor"
                                />
                              </div>
                            </div>
                          )
                        ) : (
                          <button
                            onClick={() => handleSlotClick(slot.id)}
                            disabled={uploadingSlotId !== null}
                            className="absolute inset-0 flex items-center justify-center disabled:opacity-50"
                          >
                            {uploadingSlotId === slot.id ? (
                              <div className="w-6 h-6 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <div
                                className="w-14 h-14 rounded-full border-2 border-dashed flex items-center justify-center"
                                style={{ borderColor: "#333" }}
                              >
                                <Camera size={22} style={{ color: "#333" }} />
                              </div>
                            )}
                          </button>
                        )}

                        {/* 우하단 — 교체 버튼 (채워진 슬롯) */}
                        {uploaded && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              pendingSlotId.current = slot.id;
                              replaceInputRef.current?.click();
                            }}
                            disabled={uploadingSlotId !== null}
                            className="absolute bottom-3 right-3 z-20 w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-50 active:scale-90 transition-transform"
                            style={{
                              background: "rgba(0,0,0,0.45)",
                              backdropFilter: "blur(4px)",
                            }}
                          >
                            <Camera size={15} className="text-white" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 px-1">
                        <Pencil size={10} className="text-gray-300 shrink-0" />
                        <input
                          value={slotCaptions[slot.id] ?? ""}
                          onChange={(e) =>
                            setSlotCaptions((prev) => ({
                              ...prev,
                              [slot.id]: e.target.value,
                            }))
                          }
                          onBlur={(e) => {
                            if (groupId)
                              slotService.updateCaption(
                                groupId,
                                slot.id,
                                e.target.value
                              );
                          }}
                          placeholder="텍스트 추가..."
                          maxLength={100}
                          className="flex-1 min-w-0 text-[11px] text-gray-600 bg-transparent outline-none placeholder-gray-300"
                        />
                        <span className="text-[10px] text-gray-300 shrink-0 font-mono tabular-nums">
                          {(slotCaptions[slot.id] ?? "").length}/100
                        </span>
                      </div>
                    </div>
                  );
                })}
            <button
              onClick={handleAddSlot}
              disabled={createSlot.isPending}
              className="border-2 border-dashed border-gray-200 rounded-3xl p-4 flex flex-col items-center justify-center h-36 text-gray-400 hover:bg-gray-50 hover:text-gray-600 hover:border-gray-300 transition-all active:scale-95 group disabled:opacity-50"
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
          <div
            className="flex-1 overflow-y-auto p-4 space-y-2 pb-20"
            ref={scrollRef}
          >
            {[...messages].reverse().map((msg) => {
              const isMine = msg.userId === userProfile?.id;
              const timeStr = new Date(msg.createdAt).toLocaleTimeString(
                "ko-KR",
                { hour: "2-digit", minute: "2-digit", hour12: false }
              );
              const sender = members.find((m) => m.userId === msg.userId);
              const avatarUrl = isMine
                ? userProfile?.avatar
                : sender?.avatarUrl;
              const initials = (msg.userName ?? "?")[0].toUpperCase();

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
                <div
                  key={msg.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  {/* 상대방 아바타 */}
                  {!isMine && (
                    <div className="flex flex-col items-center mr-2 mt-0.5 shrink-0">
                      {avatarUrl &&
                      (avatarUrl.startsWith("http") ||
                        avatarUrl.startsWith("data:")) ? (
                        <img
                          src={avatarUrl}
                          alt={msg.userName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-white">
                          {initials}
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    className={`flex flex-col ${
                      isMine ? "items-end" : "items-start"
                    } max-w-[70vw]`}
                  >
                    {!isMine && (
                      <span className="text-[10px] text-gray-500 ml-0.5 mb-1">
                        {msg.userName}
                      </span>
                    )}
                    <div
                      className={`flex items-end gap-1.5 ${
                        isMine ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      <div
                        className={`px-3.5 py-2.5 text-sm leading-snug shadow-sm
                        ${
                          isMine
                            ? "bg-[#1A1A1A] text-white rounded-2xl rounded-br-sm"
                            : "bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-bl-sm"
                        }`}
                      >
                        {msg.body}
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0 pb-0.5">
                        {timeStr}
                      </span>
                    </div>
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
              onCompositionStart={() => {
                isComposingRef.current = true;
              }}
              onCompositionEnd={(e) => {
                isComposingRef.current = false;
                setChatInput((e.target as HTMLInputElement).value);
              }}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                !isComposingRef.current &&
                handleSendMessage()
              }
              placeholder="메시지를 입력하세요..."
              className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-black/5"
            />
            <button
              onClick={handleSendMessage}
              disabled={!chatInput.trim() || sendMessage.isPending}
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

      {actionSheetSlotId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-8"
          onClick={() => setActionSheetSlotId(null)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full max-w-xs bg-white rounded-3xl overflow-hidden animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                const id = actionSheetSlotId;
                setActionSheetSlotId(null);
                setPendingConfirm({ type: "deleteUpload", slotId: id });
              }}
              className="w-full py-4 text-center text-red-500 font-semibold text-base active:bg-gray-50 transition-colors"
            >
              영상만 삭제
            </button>
            <div className="h-px bg-gray-100" />
            <button
              onClick={() => {
                const id = actionSheetSlotId;
                setActionSheetSlotId(null);
                setPendingConfirm({ type: "deleteSlot", slotId: id });
              }}
              className="w-full py-4 text-center text-red-500 font-semibold text-base active:bg-gray-50 transition-colors"
            >
              타임 슬롯 삭제
            </button>
            <div className="h-px bg-gray-100" />
            <button
              onClick={() => setActionSheetSlotId(null)}
              className="w-full py-4 text-center text-gray-500 font-semibold text-base active:bg-gray-50 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {showTimePickerSlotId !== null &&
        (() => {
          const slot = slots.find((s) => s.id === showTimePickerSlotId);
          if (!slot) return null;
          return (
            <ScrollTimePicker
              value={slot.timeLabel}
              onChange={(newTime) => handleTimeChange(slot.id, newTime)}
              onClose={() => setShowTimePickerSlotId(null)}
            />
          );
        })()}
    </div>
  );
};

export default GroupScreen;
