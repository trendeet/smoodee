"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Bell,
  Newspaper,
  Ghost,
  Home,
  Smile,
  Search,
  ChevronLeft,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import HUDButton from "./components/HUDButton";
import DeductionModal from "./components/DeductionModal";
import DateTimePicker from "./components/DateTimePicker";
import SetupView from "./views/SetupView";
import LobbyView from "./views/LobbyView";
import RoomView from "./views/RoomView";
import ResultView from "./views/ResultView";
import FeedView from "./views/FeedView";
import CertApprovalModal from "./components/CertApprovalModal";
import { manittoService } from "./lib/manittoService";
import {
  ManittoRoomResponse,
  ManittoLobbyResponse,
  ManittoItemResponse,
  ManittoResultResponse,
  ManittoNotificationResponse,
  ManittoVisitResponse,
  ManittoParticipantInfo,
  DropItemRequest,
  ManittoCertPostResponse,
  CertPendingPayload,
} from "./types";
import { PALETTE, MISSIONS, MissionId } from "./constants/gameConfig";

type View = "setup" | "lobby" | "room" | "result" | "feed" | "loading" | "create";

interface RoomState {
  [userId: number]: ManittoItemResponse[];
}

const ManittoWorld = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoggedIn, isInitializing, userProfile, accessToken } = useAuth();

  const [view, setView] = useState<View>("loading");
  const [roomCode, setRoomCode] = useState<string>("");
  const [roomName, setRoomName] = useState<string>("");
  const [endDate, setEndDate] = useState<string>(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  );
  const [roomData, setRoomData] = useState<ManittoRoomResponse | null>(null);
  const [lobbyData, setLobbyData] = useState<ManittoLobbyResponse | null>(null);
  const [resultData, setResultData] = useState<ManittoResultResponse | null>(
    null
  );
  const [activeRoomUserId, setActiveRoomUserId] = useState<number | null>(null);
  const [roomObjects, setRoomObjects] = useState<RoomState>({});
  const [showDeductionModal, setShowDeductionModal] = useState(false);
  const [isDeductionSolved, setIsDeductionSolved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [otherUserPresent, setOtherUserPresent] = useState(false);
  const [remoteGreetingBubble, setRemoteGreetingBubble] = useState<
    string | null
  >(null);
  const [notifications, setNotifications] = useState<
    ManittoNotificationResponse[]
  >([]);
  const [visits, setVisits] = useState<ManittoVisitResponse[]>([]);
  const [certPosts, setCertPosts] = useState<ManittoCertPostResponse[]>([]);
  const [pendingCertQueue, setPendingCertQueue] = useState<CertPendingPayload[]>([]);
  const [completedMissions, setCompletedMissions] = useState<Set<MissionId>>(new Set());
  const [justCompletedMission, setJustCompletedMission] = useState<MissionId | null>(null);
  const myUserId = userProfile?.id ?? 0;

  // localStorage key는 방+유저 단위로 분리
  const missionStorageKey = roomCode && myUserId ? `manitto_missions_${roomCode}_${myUserId}` : null;

  // roomCode/myUserId 확정 시 저장된 완료 목록 복원
  useEffect(() => {
    if (!missionStorageKey) return;
    try {
      const saved = localStorage.getItem(missionStorageKey);
      if (saved) setCompletedMissions(new Set(JSON.parse(saved) as MissionId[]));
    } catch { /* ignore */ }
  }, [missionStorageKey]);

  const completeMission = useCallback((id: MissionId) => {
    setCompletedMissions((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      if (missionStorageKey) {
        try { localStorage.setItem(missionStorageKey, JSON.stringify([...next])); } catch { /* ignore */ }
      }
      setJustCompletedMission(id);
      setTimeout(() => setJustCompletedMission(null), 2200);
      return next;
    });
  }, [missionStorageKey]);

  const loadRoom = useCallback(async (code: string, targetUserId?: number) => {
    try {
      const data = await manittoService.getRoom(code);
      setRoomData(data);
      setEndDate(data.endDate);
      if (data.status === "SETUP") {
        setView("setup");
      } else {
        await loadLobby(code, targetUserId);
      }
    } catch {
      setErrorMsg("방을 찾을 수 없습니다.");
      setView("create");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadLobby = async (code: string, targetUserId?: number) => {
    const data = await manittoService.getLobby(code);
    setLobbyData(data);
    setRoomObjects((prev) => ({ ...prev, [myUserId]: data.myLockerItems }));
    try {
      const notifs = await manittoService.getNotifications(code);
      setNotifications(notifs);
    } catch {
      /* ignore */
    }
    manittoService.getCertPosts(code).then(setCertPosts).catch(() => {});
    manittoService.getPendingCerts(code).then((pending) => {
      if (pending.length > 0) {
        setPendingCertQueue(pending.map((p) => ({ postId: p.postId, imageUrl: p.imageUrl, targetUserId: myUserId })));
      }
    }).catch(() => {});
    if (targetUserId) {
      setActiveRoomUserId(targetUserId);
      setView("room");
    } else {
      setView("lobby");
    }
  };

  const pendingVisitRef = useRef<{ targetUserId: number; posX: number; posY: number } | null>(null);

  const recordPendingVisit = useCallback(() => {
    if (pendingVisitRef.current) {
      manittoService.recordVisit(roomCode, pendingVisitRef.current).catch(() => {});
      pendingVisitRef.current = null;
    }
  }, [roomCode]);

  // 방 뷰에서 벗어날 때 presence 해제 (StrictMode 이중 실행 안전)
  const wasInRoomRef = useRef(false);
  useEffect(() => {
    if (view === "room") {
      wasInRoomRef.current = true;
    } else if (wasInRoomRef.current) {
      wasInRoomRef.current = false;
      manittoService.leavePresence(roomCode).catch(() => {});
      setOtherUserPresent(false);
    }
  }, [view, roomCode]);

  useEffect(() => {
    if (!roomCode || !accessToken) return;
    if (view !== "setup" && view !== "lobby" && view !== "room") return;
    const base =
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
    const es = new EventSource(
      `${base}/api/v1/manitto/rooms/${roomCode}/events?token=${encodeURIComponent(
        accessToken
      )}`
    );
    es.addEventListener("room-updated", async () => {
      try {
        const data = await manittoService.getRoom(roomCode);
        setRoomData(data);
        if (data.status === "ACTIVE") {
          await loadLobby(roomCode);
        }
      } catch {
        // ignore
      }
    });
    es.addEventListener("user-entered", (e) => {
      try {
        const { userId } = JSON.parse(e.data);
        if (userId !== myUserId) setOtherUserPresent(true);
      } catch {
        /* ignore */
      }
    });
    es.addEventListener("user-left", (e) => {
      try {
        const { userId } = JSON.parse(e.data);
        if (userId !== myUserId) setOtherUserPresent(false);
      } catch {
        /* ignore */
      }
    });
    es.addEventListener("greet-received", (e) => {
      try {
        const { fromUserId, text } = JSON.parse(e.data);
        if (fromUserId === myUserId) return;
        setRemoteGreetingBubble(text);
        setTimeout(() => setRemoteGreetingBubble(null), 2500);
      } catch {
        /* ignore */
      }
    });
    es.addEventListener("visitor-arrived", (e) => {
      try {
        const notif = JSON.parse(e.data);
        setNotifications((prev) => [{ id: Date.now(), ...notif }, ...prev]);
      } catch {
        /* ignore */
      }
    });
    es.addEventListener("nickname-updated", (e) => {
      try {
        const { userId, nickname } = JSON.parse(e.data);
        setRoomData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            participants: prev.participants.map((p) =>
              p.userId === userId ? { ...p, nickname } : p
            ),
          };
        });
      } catch { /* ignore */ }
    });
    es.addEventListener("cert-pending", (e) => {
      try {
        const payload: CertPendingPayload = JSON.parse(e.data);
        if (payload.targetUserId !== myUserId) return;
        setPendingCertQueue((prev) => [...prev, payload]);
      } catch { /* ignore */ }
    });
    es.addEventListener("cert-approved", (e) => {
      try {
        const post: ManittoCertPostResponse = JSON.parse(e.data);
        setCertPosts((prev) => [post, ...prev]);
      } catch { /* ignore */ }
    });
    es.addEventListener("item-dropped", (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.targetUserId === myUserId) {
          setNotifications((prev) => [{ id: Date.now(), text: payload.text, time: payload.time }, ...prev]);
          if (payload.item) {
            setRoomObjects((prev) => ({
              ...prev,
              [myUserId]: [...(prev[myUserId] ?? []), payload.item],
            }));
          }
        }
      } catch {
        /* ignore */
      }
    });
    es.onerror = () => es.close();
    return () => es.close();
  }, [roomCode, view, accessToken, myUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isInitializing) return;
    const code = searchParams.get("code");
    const roomParam = searchParams.get("room");
    const targetUserId = roomParam ? Number(roomParam) : undefined;
    if (code) {
      setRoomCode(code);
      if (isLoggedIn) {
        loadRoom(code, targetUserId).catch(() => setView("create"));
      } else {
        manittoService
          .getRoom(code)
          .then((data) => {
            setRoomData(data);
            setEndDate(data.endDate);
            setView("setup");
          })
          .catch(() => setView("create"));
      }
    } else {
      setView("create");
    }
  }, [searchParams, isLoggedIn, isInitializing, loadRoom]);

  const handleCreateRoom = async () => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await manittoService.createRoom({
        endDate,
        roomName: roomName.trim() || undefined,
      });
      setRoomData(data);
      setRoomCode(data.roomCode);
      router.replace(`/manitto?code=${data.roomCode}`, { scroll: false });
      setView("setup");
    } catch {
      setErrorMsg("방 생성에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async (code: string) => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await manittoService.joinRoom(code);
      setRoomCode(code);
      await loadRoom(code);
      router.replace(`/manitto?code=${code}`, { scroll: false });
    } catch {
      setErrorMsg("방 입장에 실패했습니다. 코드를 확인해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartMatching = async () => {
    setIsLoading(true);
    try {
      await manittoService.startMatching(roomCode);
      await loadLobby(roomCode);
    } catch {
      setErrorMsg("매칭 시작에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeEndDate = async (date: string) => {
    setEndDate(date);
  };

  const goToRoom = async (userId: number) => {
    // 다른 사람 방에서 나갈 때 발자국 기록
    recordPendingVisit();
    setActiveRoomUserId(userId);
    setView("room");
    router.replace(`/manitto?code=${roomCode}&room=${userId}`, {
      scroll: false,
    });
    // 마니띠 방 방문 미션 자동 달성
    if (userId === lobbyData?.myTargetUserId) completeMission("visit");
    // presence 등록
    manittoService.enterPresence(roomCode).catch(() => {});
    // 내 방이 아닐 때: 나갈 때 발자국 남길 위치 미리 계산해 저장
    if (userId !== myUserId) {
      const sw = typeof window !== "undefined" ? window.innerWidth : 390;
      const sh = typeof window !== "undefined" ? window.innerHeight : 700;
      const floorH = Math.max(200, sh - 60 - 130);
      const jx = Math.floor(Math.random() * 40 - 20);
      const jy = Math.floor(Math.random() * 30 - 15);
      const posX = Math.round(sw / 2 + 110 + jx);
      const posY = Math.round(130 + floorH * 0.67 + jy);
      pendingVisitRef.current = { targetUserId: userId, posX, posY };
    } else {
      // 내 방: 발자국 없음, 목록 로드
      pendingVisitRef.current = null;
      manittoService
        .getVisits(roomCode)
        .then(setVisits)
        .catch(() => {});
    }
    // 해당 유저 방 아이템 로드 (아직 없을 때만)
    if (!roomObjects[userId] || roomObjects[userId].length === 0) {
      manittoService.getUserItems(roomCode, userId).then((items) => {
        setRoomObjects((prev) => ({ ...prev, [userId]: items }));
      }).catch(() => {});
    }
  };

  const handleStoreInLocker = async (itemId: number) => {
    if (!activeRoomUserId) return;
    try {
      await manittoService.storeInLocker(roomCode, itemId);
      setRoomObjects((prev) => ({
        ...prev,
        [activeRoomUserId]: (prev[activeRoomUserId] ?? []).map((o) =>
          o.id === itemId ? { ...o, inLocker: true, isOpened: true } : o
        ),
      }));
    } catch {
      // ignore
    }
  };

  const handleDropItem = async (
    data: Omit<DropItemRequest, "targetUserId"> & { imageFile?: File; wantToShare?: boolean }
  ) => {
    if (!activeRoomUserId || !lobbyData) return;
    const { imageFile, wantToShare, ...itemData } = data;
    const req: DropItemRequest = { ...itemData, targetUserId: activeRoomUserId };
    try {
      const newItem = await manittoService.dropItem(roomCode, req);
      setRoomObjects((prev) => ({
        ...prev,
        [activeRoomUserId]: [...(prev[activeRoomUserId] ?? []), newItem],
      }));
      completeMission("drop");
      if (imageFile && wantToShare) {
        manittoService.certifyItem(roomCode, newItem.id, imageFile).catch(() => {});
      }
    } catch {
      // optimistic update failed silently
    }
  };

  const handleOpenObject = async (itemId: number) => {
    if (!activeRoomUserId) return;
    try {
      await manittoService.openItem(roomCode, itemId);
    } catch {
      // ignore
    }
    setRoomObjects((prev) => ({
      ...prev,
      [activeRoomUserId]: (prev[activeRoomUserId] ?? []).map((o) =>
        o.id === itemId ? { ...o, isOpened: true } : o
      ),
    }));
  };

  const handleDeductionSubmit = async (
    guessedUserId: number,
    reason: string
  ) => {
    try {
      await manittoService.submitDeduction(roomCode, { guessedUserId, reason });
      setIsDeductionSolved(true);
    } catch {
      setErrorMsg("추리 제출에 실패했습니다.");
    }
  };

  const handleShowResult = async () => {
    try {
      const data = await manittoService.getResult(roomCode);
      setResultData(data);
      setView("result");
    } catch {
      setErrorMsg("결과를 불러오는데 실패했습니다.");
    }
  };

  const handleLike = async (postId: number) => {
    // Optimistic update
    setCertPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, liked: !p.liked, likeCount: p.liked ? p.likeCount - 1 : p.likeCount + 1 }
          : p
      )
    );
    try {
      const result = await manittoService.toggleLike(roomCode, postId);
      setCertPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likeCount: result.likeCount, liked: result.liked } : p))
      );
    } catch {
      // Revert on error
      setCertPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, liked: !p.liked, likeCount: p.liked ? p.likeCount - 1 : p.likeCount + 1 }
            : p
        )
      );
    }
  };

  const handleRestart = () => {
    setRoomCode("");
    setRoomData(null);
    setLobbyData(null);
    setResultData(null);
    setIsDeductionSolved(false);
    setRoomObjects({});
    router.replace("/manitto");
    setView("create");
  };

  const activeRoomOwner = lobbyData?.participants.find(
    (p) => p.userId === activeRoomUserId
  );
  const isMineRoom = activeRoomUserId === myUserId;
  // 마니띠(방 주인)이거나, 해당 방 주인의 마니또(내 타겟)인 경우만 아이템 열람 가능
  const canInteractWithRoom =
    isMineRoom || activeRoomUserId === lobbyData?.myTargetUserId;
  const suspects: ManittoParticipantInfo[] = (
    lobbyData?.participants ?? []
  ).filter((p) => p.userId !== myUserId);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (view === "loading") {
    return (
      <div className="h-full flex items-center justify-center bg-[#FAF9F6]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-black border-t-[#E9967A] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs font-black text-slate-400 uppercase">
            로딩 중...
          </p>
        </div>
      </div>
    );
  }

  if (view === "create") {
    return (
      <CreateOrJoinScreen
        endDate={endDate}
        setEndDate={setEndDate}
        roomName={roomName}
        setRoomName={setRoomName}
        isLoading={isLoading}
        errorMsg={errorMsg}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        isLoggedIn={isLoggedIn}
      />
    );
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden font-mono">
      {errorMsg && (
        <div className="absolute top-20 inset-x-4 z-[300] bg-red-500 text-white text-xs font-black px-4 py-2 border-2 border-black shadow-[3px_3px_0px_0px_black] text-center">
          {errorMsg}
        </div>
      )}
      {justCompletedMission && (
        <div className="absolute top-20 inset-x-4 z-[300] bg-green-500 text-white text-xs font-black px-4 py-3 border-2 border-black shadow-[3px_3px_0px_0px_black] flex items-center justify-center gap-2 animate-bounce">
          ✓ 미션 달성! — {MISSIONS.find((m) => m.id === justCompletedMission)?.title}
        </div>
      )}
      <header className="p-4 bg-white border-b-4 border-black flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (view === "room") {
                recordPendingVisit();
                setView("lobby");
                router.replace(`/manitto?code=${roomCode}`, { scroll: false });
              } else if (view === "feed") {
                setView("lobby");
              } else {
                router.back();
              }
            }}
            className="p-1 border-2 border-black bg-white shadow-[2px_2px_0px_0px_black] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="w-9 h-9 bg-[#E9967A] border-2 border-black flex items-center justify-center text-white shadow-[2px_2px_0px_0px_black]">
            <Ghost size={20} />
          </div>
          <h1 className="font-black text-[13px] uppercase tracking-tighter">
            마니또 월드
          </h1>
        </div>
        {view !== "setup" && view !== "result" && (
          <button className="p-1 border-2 border-black bg-white shadow-[2px_2px_0px_0px_black] active:shadow-none text-black">
            <Bell size={20} />
          </button>
        )}
      </header>

      <main className="flex-1 overflow-y-auto bg-[#F8F9FA] relative">

        {view === "setup" && roomData && (
          <SetupView
            roomCode={roomCode}
            participants={roomData.participants}
            endDate={endDate}
            isHost={roomData.hostUserId === myUserId}
            myUserId={myUserId}
            onChangeEndDate={handleChangeEndDate}
            onInvite={() => {}}
            onStart={handleStartMatching}
            onNicknameSaved={(nickname) =>
              setRoomData((prev) =>
                prev
                  ? {
                      ...prev,
                      participants: prev.participants.map((p) =>
                        p.userId === myUserId ? { ...p, nickname } : p
                      ),
                    }
                  : prev
              )
            }
          />
        )}

        {view === "lobby" && lobbyData && (
          <LobbyView
            endDate={lobbyData.endDate}
            myTargetName={lobbyData.myTargetName}
            myTargetUserId={lobbyData.myTargetUserId}
            participants={lobbyData.participants}
            myUserId={myUserId}
            notifications={notifications}
            completedMissions={completedMissions}
            certPostCount={certPosts.length}
            onJoinRoom={goToRoom}
            onShowResult={handleShowResult}
            onViewFeed={() => { recordPendingVisit(); setView("feed"); }}
          />
        )}

        {view === "room" && activeRoomOwner && (
          <RoomView
            ownerName={activeRoomOwner.nickname ?? activeRoomOwner.name}
            wallColor={activeRoomOwner.avatarColor}
            ownerAvatarColor={activeRoomOwner.avatarColor}
            myAvatarColor={
              isMineRoom
                ? lobbyData?.participants.find((p) => p.userId === myUserId)
                    ?.avatarColor ?? "#E9967A"
                : "#9CA3AF"
            }
            objects={roomObjects[activeRoomUserId ?? 0] ?? []}
            visits={isMineRoom ? visits : []}
            isMine={isMineRoom}
            canInteract={canInteractWithRoom}
            otherUserPresent={otherUserPresent}
            remoteGreetingBubble={remoteGreetingBubble}
            onBack={() => {
              recordPendingVisit();
              setView("lobby");
              router.replace(`/manitto?code=${roomCode}`, { scroll: false });
            }}
            onDrop={handleDropItem}
            onOpenObject={handleOpenObject}
            onStoreInLocker={handleStoreInLocker}
            onSendGreet={(text) => {
              manittoService.sendGreet(roomCode, text).catch(() => {});
              completeMission("greet");
            }}
          />
        )}

        {view === "result" && resultData && (
          <ResultView
            result={resultData}
            onRestart={handleRestart}
            onViewAllResults={() => router.push(`/manitto/result?code=${roomCode}`)}
          />
        )}

        {view === "feed" && (
          <FeedView posts={certPosts} onLike={handleLike} />
        )}

      </main>

      {view !== "setup" && view !== "result" && (
        <div className="absolute bottom-4 right-4 z-[60] flex flex-col gap-2 items-end pointer-events-none">
          <div className="pointer-events-auto flex flex-col gap-3 items-end">
            <HUDButton
              active={view === "room" && isMineRoom}
              onClick={() => goToRoom(myUserId)}
              color={PALETTE.coral}
              icon={<Smile />}
              label="내 방으로"
            />
            <HUDButton
              active={showDeductionModal}
              onClick={() => setShowDeductionModal(true)}
              color={PALETTE.beige}
              icon={<Search />}
              label="추리하기"
            />
            <HUDButton
              active={view === "lobby"}
              onClick={() => { recordPendingVisit(); setView("lobby"); }}
              color={PALETTE.darkNavy}
              icon={<Home />}
              label="로비로"
              large
            />
          </div>
        </div>
      )}

      {showDeductionModal && (
        <DeductionModal
          suspects={suspects}
          isSolved={isDeductionSolved}
          onClose={() => setShowDeductionModal(false)}
          onSubmit={handleDeductionSubmit}
        />
      )}

      {pendingCertQueue.length > 0 && (
        <CertApprovalModal
          imageUrl={pendingCertQueue[0].imageUrl}
          onApprove={(comment) => {
            manittoService.approveCert(roomCode, pendingCertQueue[0].postId, comment).catch(() => {});
            setPendingCertQueue((prev) => prev.slice(1));
          }}
          onReject={() => {
            manittoService.rejectCert(roomCode, pendingCertQueue[0].postId).catch(() => {});
            setPendingCertQueue((prev) => prev.slice(1));
          }}
          onClose={() => setPendingCertQueue((prev) => prev.slice(1))}
        />
      )}
    </div>
  );
};

// ── Create/Join screen (shown before entering a room) ─────────────────────────

interface CreateOrJoinScreenProps {
  endDate: string;
  setEndDate: (d: string) => void;
  roomName: string;
  setRoomName: (name: string) => void;
  isLoading: boolean;
  errorMsg: string | null;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  isLoggedIn: boolean;
}

function CreateOrJoinScreen({
  endDate,
  setEndDate,
  roomName,
  setRoomName,
  isLoading,
  errorMsg,
  onCreateRoom,
  onJoinRoom,
  isLoggedIn,
}: CreateOrJoinScreenProps) {
  const [joinCode, setJoinCode] = useState("");
  const router = useRouter();

  return (
    <div className="h-full flex flex-col bg-[#FAF9F6] font-mono">
      <div className="p-4 border-b-4 border-black bg-white sticky top-0 z-50">
        <button
          onClick={() => router.back()}
          className="p-1 border-2 border-black bg-white shadow-[2px_2px_0px_0px_black] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
        >
          <ChevronLeft size={20} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="min-h-full flex flex-col items-center justify-center">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-[#E9967A] border-4 border-black mx-auto flex items-center justify-center shadow-[6px_6px_0px_0px_black] mb-4">
                <Ghost size={40} className="text-white" />
              </div>
              <h1 className="text-2xl font-black uppercase tracking-tighter mb-2">
                마니또 월드
              </h1>
              <p className="text-[11px] font-bold text-slate-400">
                비밀 수호천사가 되어보세요!
              </p>
            </div>

            {errorMsg && (
              <div className="bg-red-50 border-2 border-red-500 p-3 text-[11px] font-black text-red-600 text-center">
                {errorMsg}
              </div>
            )}

            {/* Create room */}
            <div className="bg-white border-4 border-black p-5 shadow-[6px_6px_0px_0px_black]">
              <h2 className="text-sm font-black mb-4 uppercase text-[#E9967A]">
                새 방 만들기
              </h2>
              <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">
                방 이름 (선택)
              </label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="예: 동아리 마니또"
                maxLength={30}
                className="w-full font-black text-xs p-2 border-2 border-black focus:outline-none mb-4 bg-[#FAF9F6]"
              />
              <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">
                종료 기간
              </label>
              <DateTimePicker value={endDate} onChange={setEndDate} />
              <button
                onClick={onCreateRoom}
                disabled={isLoading || !isLoggedIn}
                className="w-full py-3 bg-[#E9967A] text-white border-4 border-black font-black text-sm shadow-[4px_4px_0px_0px_black] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading
                  ? "생성 중..."
                  : isLoggedIn
                  ? "방 만들기"
                  : "로그인 후 이용 가능"}
              </button>
            </div>

            {/* Join room */}
            <div className="bg-white border-4 border-black p-5 shadow-[6px_6px_0px_0px_black]">
              <h2 className="text-sm font-black mb-4 uppercase text-[#162B44]">
                초대 코드로 입장
              </h2>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="코드 6자리 입력"
                maxLength={6}
                className="w-full font-black text-xs p-2 border-2 border-black focus:outline-none mb-4 uppercase tracking-widest"
              />
              <button
                onClick={() => onJoinRoom(joinCode)}
                disabled={joinCode.length !== 6 || isLoading || !isLoggedIn}
                className="w-full py-3 bg-[#162B44] text-white border-4 border-black font-black text-sm shadow-[4px_4px_0px_0px_black] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                입장하기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ManittoWorld;
