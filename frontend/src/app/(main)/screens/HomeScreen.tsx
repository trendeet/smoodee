"use client";

import React, { useState } from "react";
import {
  Bell,
  Search,
  Menu,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Check,
  Camera,
  Sparkles,
  MessageCircle,
  Film,
  X,
} from "lucide-react";
import DayShareSheet from "@/features/dayshare/components/DayShareSheet";
import { useRouter } from "next/navigation";
import StatusBar from "@/components/ui/StatusBar";
import TemplateCard from "@/features/templates/components/TemplateCard";
import { useScraps } from "@/hooks/useScraps";
import { useNotifications } from "@/hooks/useNotifications";
import { useTemplates } from "@/hooks/useTemplates";
import { useUI } from "@/lib/context/UIContext";
import { useAuth } from "@/lib/context/AuthContext";
import { TemplateResponse } from "@/lib/api/types";


const FALLBACK_TEMPLATES: TemplateResponse[] = [
  {
    id: 1,
    type: "COLORWORK",
    title: "컬러워크",
    tags: ["개인"],
    description: "나만의 색상으로 사진 기록",
  },
  {
    id: 2,
    type: "DAYSHARE",
    title: "하루 공유",
    tags: ["그룹"],
    description: "그룹과 함께 하루 기록",
  },
  {
    id: 3,
    type: "MANITTO",
    title: "마니또 월드",
    tags: ["그룹"],
    description: "익명의 비밀 수호천사 게임",
  },
];

const HomeScreen = () => {
  const router = useRouter();
  const { isScrapped, toggle } = useScraps();
  const { data: notifications = [], markRead } = useNotifications();
  const { data: rawTemplates, isLoading: templatesLoading } = useTemplates();
  const templatesData = (() => {
    const base =
      rawTemplates && rawTemplates.length > 0
        ? rawTemplates
        : !templatesLoading
        ? FALLBACK_TEMPLATES
        : [];
    // Always include MANITTO if not already present from server
    const hasManitto = base.some((t) => t.type === "MANITTO");
    return hasManitto ? base : [...base, FALLBACK_TEMPLATES.find((t) => t.type === "MANITTO")!];
  })();
  const { openMenu } = useUI();
  const { isLoggedIn } = useAuth();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [filter, setFilter] = useState("전체");
  const [searchText, setSearchText] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showDayShareSheet, setShowDayShareSheet] = useState(false);

  const filters = ["전체", "개인", "그룹"];

  const unreadNotifications = notifications.filter((n) => !n.read);
  const hasUnread = unreadNotifications.length > 0;

  // ── 템플릿별 스타일 ────────────────────────────────────────────────────────
  const getTemplateStyle = (type: string) => {
    if (type === "NEW_TEMPLATE") {
      // 마니또 등 공지성 알림 — 추후 template 필드로 분기 예정
      return {
        gradient: "from-purple-500 to-purple-400",
        icon: <Sparkles className="w-4 h-4 text-white" />,
        labelColor: "text-purple-600",
        bgColor: "bg-purple-50",
        templateName: "공지",
      };
    }
    // 하루공유 (그룹 관련 알림 기본)
    return {
      gradient: "from-blue-400 to-cyan-300",
      icon: <Film className="w-4 h-4 text-white" />,
      labelColor: "text-cyan-600",
      bgColor: "bg-cyan-50",
      templateName: "하루공유",
    };
    /* 향후 추가 예정 템플릿 스타일
    컬러워크: { gradient: "from-orange-500 to-red-400", icon: <Palette />, labelColor: "text-orange-600", bgColor: "bg-orange-50", templateName: "컬러워크" }
    마니또:  { gradient: "from-violet-500 to-purple-400", icon: <Wand2 />, labelColor: "text-violet-600", bgColor: "bg-violet-50", templateName: "마니또" }
    */
  };

  const getTypeInfo = (type: string) => {
    switch (type) {
      case "NEW_CHAT_MESSAGE":
        return { icon: <MessageCircle className="w-3 h-3" />, label: "새 메시지" };
      case "GROUP_COMPLETE":
      case "GROUP_RENDER_DONE":
        return { icon: <Check className="w-3 h-3" />, label: "완료" };
      case "SLOT_FILLED":
      case "SLOT_UPLOAD_DONE":
        return { icon: <Camera className="w-3 h-3" />, label: "업로드" };
      case "NEW_TEMPLATE":
        return { icon: <Sparkles className="w-3 h-3" />, label: "공지" };
      default:
        return { icon: <Bell className="w-3 h-3" />, label: "알림" };
    }
  };

  return (
    <div className="flex flex-col h-full bg-white pb-safe overflow-y-auto no-scrollbar relative">
      <StatusBar theme="dark" />
      <div className="px-4 pb-2 sticky top-0 bg-white/95 backdrop-blur-md z-30 border-b border-gray-100/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={openMenu}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-black tracking-tight">Smoodee</h1>
          </div>
          <button
            onClick={() => setShowNotifications(true)}
            className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <Bell size={20} />
            {hasUnread && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
        </div>
        <button
          onClick={() => router.push("/guide")}
          className="w-full mb-3 bg-gray-900 text-white rounded-2xl p-3 flex items-center justify-between shadow-lg active:scale-98 transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <HelpCircle size={16} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-white/70">처음이신가요?</p>
              <p className="font-bold text-sm">사용법 알아보기</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-white/50" />
        </button>
        <div className="relative mb-3">
          <div className="relative group">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors"
            />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="템플릿 검색..."
              className="w-full bg-gray-100 rounded-2xl pl-10 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black/5 focus:bg-white transition-all shadow-sm"
            />
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                filter === f
                  ? "bg-black text-white border-black shadow-md"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 mt-6">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-900">
          {searchText
            ? `"${searchText}" 검색 결과`
            : filter === "전체"
            ? "이번 주 인기"
            : `${filter} 템플릿`}
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {templatesLoading && (
            <div className="col-span-2 py-12 flex items-center justify-center text-gray-400 text-sm">
              불러오는 중...
            </div>
          )}
          {!templatesLoading &&
            (() => {
              const filtered = templatesData.filter((t) => {
                const tags = Array.isArray(t.tags) ? t.tags : [];
                const matchesFilter =
                  filter === "전체"
                    ? true
                    : filter === "개인"
                    ? tags.includes("개인") || t.type === "COLORWORK"
                    : filter === "그룹"
                    ? tags.includes("그룹") || t.type === "DAYSHARE" || t.type === "MANITTO"
                    : tags.includes(filter);

                const q = searchText.toLowerCase();
                const matchesSearch =
                  !q ||
                  (t.title ?? "").toLowerCase().includes(q) ||
                  (t.description ?? "").toLowerCase().includes(q) ||
                  tags.some((tag) => tag.toLowerCase().includes(q));

                return matchesFilter && matchesSearch;
              });

              if (filtered.length === 0) {
                return (
                  <div className="col-span-2 py-16 flex flex-col items-center justify-center text-gray-400">
                    <Search size={28} className="mb-3 opacity-30" />
                    <p className="text-sm font-medium">검색 결과가 없어요</p>
                  </div>
                );
              }

              return filtered.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  onClick={() => {
                    if (t.type === "COLORWORK") router.push("/colorwork");
                    else if (t.type === "DAYSHARE") setShowDayShareSheet(true);
                    else if (t.type === "MANITTO") router.push("/manitto");
                    else router.push("/");
                  }}
                  isScrapped={isScrapped(t.type)}
                  onScrap={() => {
                    if (!isLoggedIn) { setShowLoginPrompt(true); return; }
                    toggle(t.type);
                  }}
                />
              ));
            })()}
        </div>
      </div>

      {showNotifications && (
        <div className="absolute inset-0 z-50 bg-white animate-slide-down flex flex-col pb-safe">
          <StatusBar theme="dark" />
          <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-md z-10">
            <button
              onClick={() => setShowNotifications(false)}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
            >
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-lg font-bold tracking-tight text-gray-900">
              알림
            </h1>
          </div>

          <div className="flex-1 overflow-y-auto">
            {unreadNotifications.length > 0 ? (
              <div className="flex flex-col">
                {unreadNotifications.map((noti) => {
                  const style = getTemplateStyle(noti.type);
                  const typeInfo = getTypeInfo(noti.type);
                  return (
                    <div
                      key={noti.id}
                      onClick={() => {
                        markRead.mutate(noti.id);
                        if (noti.type === "NEW_CHAT_MESSAGE" && noti.referenceId) {
                          setShowNotifications(false);
                          router.push(`/inprogress/group/${noti.referenceId}?tab=chat`);
                        }
                      }}
                      className="group relative p-5 flex gap-4 transition-all hover:bg-gray-50 border-b border-gray-50 active:scale-[0.98] cursor-pointer"
                    >
                      {/* 템플릿 로고 */}
                      <div className={`shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br ${style.gradient} flex items-center justify-center shadow-md shadow-cyan-100`}>
                        {style.icon}
                      </div>

                      <div className="flex-1 flex flex-col gap-1 pr-6">
                        {/* 템플릿명 + 타입 + 날짜 */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${style.bgColor} ${style.labelColor} uppercase tracking-wider`}>
                              {style.templateName}
                            </span>
                            <div className="flex items-center gap-1 text-gray-400 text-[11px]">
                              {typeInfo.icon}
                              <span>{typeInfo.label}</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-gray-300 font-medium">
                            {new Date(noti.createdAt).toLocaleDateString("ko-KR")}
                          </span>
                        </div>

                        {/* 알림 내용 */}
                        <p className="text-[14px] text-gray-700 line-clamp-2 leading-snug mt-0.5">
                          {noti.body}
                        </p>
                      </div>

                      {/* 읽음 처리 힌트 */}
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-gray-100 p-1.5 rounded-full">
                          <X className="w-3 h-3 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <Bell size={28} className="opacity-20" />
                </div>
                <p className="text-sm font-medium">새로운 알림이 없습니다</p>
              </div>
            )}

            {/* 리스트 푸터 */}
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 bg-gray-200 rounded-full" />
                <div className="w-1.5 h-1.5 bg-gray-200 rounded-full" />
                <div className="w-1.5 h-1.5 bg-gray-200 rounded-full" />
              </div>
              <p className="text-[11px] text-gray-300 font-bold tracking-widest uppercase">End of notifications</p>
            </div>
          </div>
        </div>
      )}

      {showDayShareSheet && (
        <DayShareSheet onClose={() => setShowDayShareSheet(false)} />
      )}

      {/* 로그인 필요 팝업 */}
      {showLoginPrompt && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center px-8"
          onClick={() => setShowLoginPrompt(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full max-w-xs bg-white rounded-3xl px-6 py-8 flex flex-col items-center gap-4 shadow-xl animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-3xl">🔒</div>
            <div className="text-center">
              <p className="font-bold text-base text-gray-900">로그인이 필요해요</p>
              <p className="text-xs text-gray-500 mt-1">찜하려면 먼저 로그인해 주세요.</p>
            </div>
            <button
              onClick={() => router.push("/login")}
              className="w-full py-3 bg-[#1A1A1A] text-white font-bold rounded-2xl text-sm active:scale-[0.98] transition-transform"
            >
              로그인하기
            </button>
            <button
              onClick={() => setShowLoginPrompt(false)}
              className="text-xs text-gray-400 font-medium"
            >
              나중에 하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeScreen;
