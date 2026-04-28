"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Menu,
  Plus,
  User,
  Users,
  FolderClock,
  X,
  Image as ImageIcon,
  Trash2,
  CheckCircle2,
  Circle,
  Film,
  Hash,
} from "lucide-react";
import StatusBar from "@/components/ui/StatusBar";
import Toast from "@/components/ui/Toast";
import TemplateCard from "@/features/templates/components/TemplateCard";
import { useProjects } from "@/hooks/useProjects";
import { useTemplates } from "@/hooks/useTemplates";
import { useUI } from "@/lib/context/UIContext";
import { useAuth } from "@/lib/context/AuthContext";
import { projectService } from "@/lib/api/projectService";
import { groupService } from "@/lib/api/groupService";
import { LAYOUT_CONFIG } from "@/features/colorwork/layoutConfig";

const TEMPLATE_NAMES: Record<string, string> = {
  COLORWORK: "컬러워크",
  DAYSHARE: "하루공유",
};

const STATUS_PROGRESS: Record<string, number> = {
  INIT: 10,
  UPLOADING: 50,
  SLOT_CONFIG: 60,
  CREATED: 75,
  IN_PROGRESS: 75,
  DONE: 100,
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return `${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

const GroupMemberAvatars = ({ groupId }: { groupId: number }) => {
  const { data: members = [] } = useQuery({
    queryKey: ["group", groupId, "members"],
    queryFn: () => groupService.getMembers(groupId),
    staleTime: 60_000,
  });

  if (members.length === 0) {
    return (
      <div className="flex -space-x-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex -space-x-2">
      {members.map((m) => {
        const url = m.avatarUrl;
        const isImg = url && (url.startsWith("http") || url.startsWith("data:"));
        return isImg ? (
          <img
            key={m.userId}
            src={url}
            alt={m.name}
            className="w-8 h-8 rounded-full border-2 border-white object-cover"
          />
        ) : (
          <div
            key={m.userId}
            className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white ${url ?? "bg-gray-300"}`}
          >
            {!url && (m.name?.[0] ?? "?").toUpperCase()}
          </div>
        );
      })}
    </div>
  );
};

const InProgressPage = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { openMenu } = useUI();
  const { userProfile } = useAuth();

  const subTab = (searchParams.get("tab") as "personal" | "group") ?? "personal";
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showArchiveToast, setShowArchiveToast] = useState(false);

  // 초대코드 입장
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  // 선택 모드
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // 삭제 확인
  const [pendingDeleteIds, setPendingDeleteIds] = useState<number[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // 그룹 나가기/삭제 확인
  const [pendingGroupAction, setPendingGroupAction] = useState<{ projectId: number; groupId: number; isOwner: boolean } | null>(null);
  const [isGroupActioning, setIsGroupActioning] = useState(false);

  const {
    data: personalProjects = [],
    isLoading: loadingPersonal,
  } = useProjects({ type: "PERSONAL", tab: "IN_PROGRESS" });

  const {
    data: groupProjects = [],
    isLoading: loadingGroup,
  } = useProjects({ type: "GROUP", tab: "IN_PROGRESS" });

  const { data: groupTemplates = [] } = useTemplates();

  const handleGroupCardClick = (project: { id: number; groupId?: number; title: string }) => {
    if (!project.groupId) return;
    router.push(`/inprogress/group/${project.groupId}`);
  };

  // ── 선택 모드 ──────────────────────────────────────────────────────────

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

  const currentProjects = subTab === "personal" ? personalProjects : groupProjects;
  const isAllSelected =
    currentProjects.length > 0 && currentProjects.every((p) => selectedIds.has(p.id));

  const toggleSelectAll = () => {
    setSelectedIds(isAllSelected ? new Set() : new Set(currentProjects.map((p) => p.id)));
  };

  // ── 삭제 ───────────────────────────────────────────────────────────────

  const requestDelete = (ids: number[]) => setPendingDeleteIds(ids);

  const handleDeleteConfirm = async () => {
    if (pendingDeleteIds.length === 0 || isDeleting) return;
    setIsDeleting(true);
    try {
      const allProjects = [...personalProjects, ...groupProjects];
      await Promise.all(
        pendingDeleteIds.map((id) => {
          const project = allProjects.find((p) => p.id === id);
          if (project?.groupId) {
            const isOwner =
              !!(project.ownerId && userProfile?.id && project.ownerId === userProfile.id);
            return isOwner
              ? projectService.deleteProject(id)
              : groupService.leaveGroup(project.groupId);
          }
          return projectService.deleteProject(id);
        })
      );
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      exitSelectMode();
    } finally {
      setIsDeleting(false);
      setPendingDeleteIds([]);
    }
  };

  const handleGroupActionConfirm = async () => {
    if (!pendingGroupAction || isGroupActioning) return;
    setIsGroupActioning(true);
    try {
      if (pendingGroupAction.isOwner) {
        await projectService.deleteProject(pendingGroupAction.projectId);
      } else {
        await groupService.leaveGroup(pendingGroupAction.groupId);
      }
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    } finally {
      setIsGroupActioning(false);
      setPendingGroupAction(null);
    }
  };

  const handleJoinByCode = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code || isJoining) return;
    setIsJoining(true);
    setJoinError(null);
    try {
      const group = await groupService.joinGroup({ inviteCode: code });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setShowJoinModal(false);
      setJoinCode("");
      router.push(`/inprogress/group/${group.id}`);
    } catch (e: unknown) {
      const code2 = (e as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code ?? "";
      if (code2 === "ALREADY_GROUP_MEMBER") {
        // 이미 멤버면 그냥 입장
        try {
          const group = await groupService.getGroupByInviteCode(code);
          setShowJoinModal(false);
          setJoinCode("");
          router.push(`/inprogress/group/${group.id}`);
        } catch {
          setJoinError("그룹을 찾을 수 없어요.");
        }
      } else if (code2 === "GROUP_FULL") {
        setJoinError("그룹이 가득 찼어요.");
      } else if (code2 === "INVALID_INVITE_CODE") {
        setJoinError("코드를 다시 확인해주세요.");
      } else {
        setJoinError("입장에 실패했어요. 다시 시도해주세요.");
      }
    } finally {
      setIsJoining(false);
    }
  };

  const hasModal = pendingDeleteIds.length > 0 || showTemplateModal;

  return (
    // 외부: 스크롤 없음, absolute 포지셔닝 기준
    <div className="flex flex-col h-full bg-white relative overflow-hidden">
{showArchiveToast && <Toast message="보관함으로 이동되었습니다!" />}

      {/* 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
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
                <span className="text-sm font-bold text-gray-900">
                  {selectedIds.size}개 선택됨
                </span>
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
                  <h1 className="text-2xl font-black tracking-tight text-gray-900">
                    진행 중인 템플릿
                  </h1>
                </div>
                <div className="flex items-center gap-2">
                  {subTab === "personal" && personalProjects.length > 0 && (
                    <button
                      onClick={() => setIsSelectMode(true)}
                      className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors px-2 py-1"
                    >
                      선택
                    </button>
                  )}
                  {subTab === "group" && (
                    <div className="flex items-center gap-2">
                      {groupProjects.length > 0 && (
                        <button
                          onClick={() => setIsSelectMode(true)}
                          className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors px-2 py-1"
                        >
                          선택
                        </button>
                      )}
                      <button
                        onClick={() => setShowTemplateModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-xs font-bold rounded-full shadow-lg active:scale-95 transition-transform"
                      >
                        <Plus size={14} />
                        <span>만들기</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { router.replace(`${pathname}?tab=personal`); exitSelectMode(); }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                subTab === "personal" ? "bg-black text-white" : "bg-gray-100 text-gray-500"
              }`}
            >
              <User size={14} />
              개인
            </button>
            <button
              onClick={() => { router.replace(`${pathname}?tab=group`); exitSelectMode(); }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                subTab === "group" ? "bg-black text-white" : "bg-gray-100 text-gray-500"
              }`}
            >
              <Users size={14} />
              그룹
            </button>
          </div>
        </div>

        {/* 카드 목록 */}
        <div className="p-4 space-y-4 pb-4">
          {subTab === "group" && !isSelectMode && (
            <button
              onClick={() => { setShowJoinModal(true); setJoinCode(""); setJoinError(null); }}
              className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 border border-dashed border-gray-200 rounded-2xl hover:bg-gray-100 transition-colors active:scale-[0.98]"
            >
              <div className="w-8 h-8 bg-white rounded-xl border border-gray-200 flex items-center justify-center shrink-0">
                <Hash size={16} className="text-gray-500" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-gray-700">초대코드로 입장하기</p>
                <p className="text-xs text-gray-400">친구에게 받은 코드를 입력해주세요</p>
              </div>
            </button>
          )}
          {subTab === "personal" ? (
            loadingPersonal ? (
              Array(2).fill(0).map((_, i) => (
                <div key={i} className="h-32 bg-gray-100 rounded-3xl animate-pulse" />
              ))
            ) : personalProjects.length > 0 ? (
              personalProjects.map((project) => {
                const isSelected = selectedIds.has(project.id);
                return (
                  <div
                    key={project.id}
                    onClick={() => isSelectMode ? toggleSelect(project.id) : router.push(`/colorwork?projectId=${project.id}`)}
                    className={`bg-white border-2 rounded-3xl p-5 shadow-sm transition-all cursor-pointer active:scale-[0.98] ${
                      isSelected ? "border-red-400 bg-red-50/30 shadow-red-100" : "border-gray-100 hover:shadow-md"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        {isSelectMode && (
                          <div className="shrink-0">
                            {isSelected
                              ? <CheckCircle2 size={22} className="text-red-500" />
                              : <Circle size={22} className="text-gray-300" />}
                          </div>
                        )}
                        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-red-500 to-orange-400 shadow-inner shrink-0 flex items-center justify-center">
                          {project.status === "DONE" && project.thumbnailUrl ? (
                            <img src={project.thumbnailUrl} alt="thumbnail" className="w-full h-full object-cover" />
                          ) : project.frameUrls && project.frameUrls.length > 0 && project.gridType ? (
                            (() => {
                              const cfg = LAYOUT_CONFIG[project.gridType as keyof typeof LAYOUT_CONFIG];
                              return cfg ? (
                                <div
                                  className="w-full h-full grid p-[3px] bg-white/10"
                                  style={{
                                    gridTemplateAreas: cfg.containerStyle.gridTemplateAreas,
                                    gridTemplateColumns: cfg.containerStyle.gridTemplateColumns,
                                    gridTemplateRows: cfg.containerStyle.gridTemplateRows,
                                    gap: "2px",
                                  }}
                                >
                                  {project.frameUrls.map((url, i) => (
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
                            <ImageIcon className="text-white/80" size={24} />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg text-gray-900 leading-tight">{TEMPLATE_NAMES[project.templateType] ?? project.templateType}</h3>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
                          {formatDate(project.createdAt)}
                        </span>
                        {!isSelectMode && (
                          <button
                            onClick={(e) => { e.stopPropagation(); requestDelete([project.id]); }}
                            className="p-1.5 rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-gray-500">
                        <span>진행률</span>
                        {project.templateType === "COLORWORK" && project.totalFrames != null && project.totalFrames > 0 ? (
                          <span className="text-blue-500">{project.filledFrames}/{project.totalFrames}</span>
                        ) : (
                          <span className="text-blue-500">{STATUS_PROGRESS[project.status] ?? 0}%</span>
                        )}
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                          style={{
                            width: project.templateType === "COLORWORK" && project.totalFrames
                              ? `${Math.round(((project.filledFrames ?? 0) / project.totalFrames) * 100)}%`
                              : `${STATUS_PROGRESS[project.status] ?? 0}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <FolderClock size={32} className="opacity-20" />
                </div>
                <p className="text-sm font-medium">진행 중인 템플릿이 없어요.</p>
                <p className="text-xs mt-1">새로운 템플릿을 시작해보세요!</p>
              </div>
            )
          ) : loadingGroup ? (
            Array(2).fill(0).map((_, i) => (
              <div key={i} className="h-40 bg-gray-100 rounded-3xl animate-pulse" />
            ))
          ) : groupProjects.length > 0 ? (
            groupProjects.map((project) => {
              const isSelected = selectedIds.has(project.id);
              return (
                <div
                  key={project.id}
                  onClick={() => isSelectMode ? toggleSelect(project.id) : handleGroupCardClick(project)}
                  className={`bg-white border-2 rounded-3xl p-5 shadow-sm transition-all cursor-pointer active:scale-[0.98] ${
                    isSelected ? "border-red-400 bg-red-50/30 shadow-red-100" : "border-gray-100 hover:shadow-md"
                  }`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                      {isSelectMode && (
                        <div className="shrink-0">
                          {isSelected
                            ? <CheckCircle2 size={22} className="text-red-500" />
                            : <Circle size={22} className="text-gray-300" />}
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        {project.thumbnailUrl ? (
                          <img
                            src={project.thumbnailUrl}
                            alt="cover"
                            className="w-14 h-14 rounded-2xl object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-300 overflow-hidden flex flex-col items-center justify-center shrink-0">
                            <div className="w-6 h-6 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-1">
                              <Film size={12} className="text-white" />
                            </div>
                            <span className="font-black text-[8px] text-white leading-tight tracking-tight text-center">DAY<br />SHARE</span>
                          </div>
                        )}
                        <span className="font-bold text-base text-gray-900 leading-tight">{project.title ?? "하루공유 그룹"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {project.groupId ? (
                        <GroupMemberAvatars groupId={project.groupId} />
                      ) : (
                        <div className="flex -space-x-2">
                          {[...Array(project.memberCount ?? 2)].map((_, i) => (
                            <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200" />
                          ))}
                        </div>
                      )}
                      {!isSelectMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (project.groupId) {
                              setPendingGroupAction({
                                projectId: project.id,
                                groupId: project.groupId,
                                isOwner: !!(
                                  project.ownerId &&
                                  userProfile?.id &&
                                  project.ownerId === userProfile.id
                                ),
                              });
                            } else if (
                              project.ownerId &&
                              userProfile?.id &&
                              project.ownerId === userProfile.id
                            ) {
                              // groupId 누락됐지만 소유자인 경우만 삭제 허용
                              requestDelete([project.id]);
                            }
                            // 소유자도 아니고 groupId도 없으면 아무 동작 안 함
                          }}
                          className="p-1.5 rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-gray-400">
                      <span>진행률</span>
                      <span className="text-black">{STATUS_PROGRESS[project.status] ?? 0}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000"
                        style={{ width: `${STATUS_PROGRESS[project.status] ?? 0}%` }}
                      />
                    </div>
                  </div>
                  {!isSelectMode && project.status === "DONE" && (
                    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col items-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowArchiveToast(true);
                          setTimeout(() => setShowArchiveToast(false), 1500);
                          queryClient.invalidateQueries({ queryKey: ["projects"] });
                        }}
                        className="w-full py-2.5 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-bold shadow-sm hover:bg-indigo-100 transition-colors active:scale-95 mb-1.5 flex items-center justify-center gap-1.5"
                      >
                        <FolderClock size={16} /> 보관함으로 옮기기
                      </button>
                      <p className="text-[10px] text-gray-400 font-medium">
                        2일 뒤 보관함으로 자동 이동됩니다
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <Users size={32} className="opacity-20" />
              </div>
              <p className="text-sm font-medium">참여 중인 그룹이 없어요.</p>
              <p className="text-xs mt-1">새로운 그룹을 만들어보세요!</p>
            </div>
          )}
        </div>
      </div>

      {/* 선택 모드 하단 삭제 바 — 스크롤 영역 바깥 */}
      {isSelectMode && (
        <div className="bg-white border-t border-gray-100 px-4 py-3 pb-safe flex items-center gap-3">
          <span className="flex-1 text-sm font-bold text-gray-500">
            {selectedIds.size > 0 ? `${selectedIds.size}개 선택됨` : "항목을 선택하세요"}
          </span>
          <button
            onClick={() => requestDelete(Array.from(selectedIds))}
            disabled={selectedIds.size === 0}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-red-500 text-white text-sm font-bold rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all"
          >
            <Trash2 size={16} />
            삭제
          </button>
        </div>
      )}

      {/* 삭제 확인 모달 — absolute는 스크롤 없는 외부 div 기준 */}
      {pendingDeleteIds.length > 0 && (
        <div
          className="absolute inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => !isDeleting && setPendingDeleteIds([])}
        >
          <div
            className="bg-white w-full rounded-t-3xl p-6 pb-safe animate-slide-up"
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

      {/* 그룹 나가기/삭제 확인 모달 */}
      {pendingGroupAction && (
        <div
          className="absolute inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => !isGroupActioning && setPendingGroupAction(null)}
        >
          <div
            className="bg-white w-full rounded-t-3xl p-6 pb-safe animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <Trash2 size={24} className="text-red-400" />
              </div>
              <h2 className="text-xl font-black text-gray-900">
                {pendingGroupAction.isOwner ? "그룹을 삭제할까요?" : "그룹에서 나갈까요?"}
              </h2>
              <p className="text-sm text-gray-500 font-medium mt-2">
                {pendingGroupAction.isOwner
                  ? "삭제하면 모든 멤버가 방에서 나가게 됩니다."
                  : "나가면 다시 초대코드로 입장해야 해요."}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingGroupAction(null)}
                disabled={isGroupActioning}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-2xl text-sm font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleGroupActionConfirm}
                disabled={isGroupActioning}
                className="flex-1 py-3 bg-red-500 text-white rounded-2xl text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isGroupActioning ? "처리 중..." : pendingGroupAction.isOwner ? "삭제" : "나가기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 초대코드 입장 모달 */}
      {showJoinModal && (
        <div
          className="absolute inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => !isJoining && setShowJoinModal(false)}
        >
          <div
            className="bg-white w-full rounded-t-3xl p-6 pb-safe animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-black">초대코드 입력</h2>
                <p className="text-sm text-gray-500 font-medium mt-1">
                  친구에게 받은 코드를 입력해주세요.
                </p>
              </div>
              <button
                onClick={() => setShowJoinModal(false)}
                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="mb-4">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value.toUpperCase());
                  setJoinError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleJoinByCode()}
                placeholder="예: AB12CD34"
                maxLength={20}
                className={`w-full text-center text-2xl font-black tracking-[0.3em] py-4 px-6 rounded-2xl border-2 bg-gray-50 focus:outline-none transition-colors ${
                  joinError
                    ? "border-red-400 text-red-500"
                    : "border-gray-200 focus:border-black text-gray-900"
                }`}
                autoFocus
              />
              {joinError && (
                <p className="text-center text-sm font-bold text-red-500 mt-2">
                  {joinError}
                </p>
              )}
            </div>
            <button
              onClick={handleJoinByCode}
              disabled={!joinCode.trim() || isJoining}
              className="w-full py-4 bg-black text-white rounded-2xl text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all"
            >
              {isJoining ? "입장 중..." : "입장하기"}
            </button>
          </div>
        </div>
      )}

      {/* 템플릿 선택 모달 */}
      {showTemplateModal && (
        <div
          className="absolute inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowTemplateModal(false)}
        >
          <div
            className="bg-white w-full rounded-t-3xl p-6 pb-safe animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-black">어떤 그룹을 만들어볼까요?</h2>
                <p className="text-sm text-gray-500 font-medium mt-1">함께할 템플릿을 선택해주세요.</p>
              </div>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 pb-4">
              {groupTemplates.filter((t) => t.type === "DAYSHARE").map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  onClick={() => { setShowTemplateModal(false); router.push("/day_share"); }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function Page() {
  return (
    <Suspense>
      <InProgressPage />
    </Suspense>
  );
}
