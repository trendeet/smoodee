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
  UserPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import StatusBar from "@/components/ui/StatusBar";
import Button from "@/components/ui/Button";
import TemplateCard from "@/features/templates/components/TemplateCard";
import { useScraps } from "@/hooks/useScraps";
import { useNotifications } from "@/hooks/useNotifications";
import { useTemplates } from "@/hooks/useTemplates";
import { useUI } from "@/lib/context/UIContext";
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
];

const HomeScreen = () => {
  const router = useRouter();
  const { isScrapped, toggle } = useScraps();
  const { data: notifData, markRead } = useNotifications();
  const { data: rawTemplates, isLoading: templatesLoading } = useTemplates();
  const templatesData =
    rawTemplates && rawTemplates.length > 0
      ? rawTemplates
      : !templatesLoading
      ? FALLBACK_TEMPLATES
      : [];
  const { openMenu } = useUI();
  const [filter, setFilter] = useState("전체");
  const [searchText, setSearchText] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);

  const filters = ["전체", "개인", "그룹"];

  const notifications = notifData?.items ?? [];

  const notifIcon = (type: string) => {
    if (type === "GROUP_COMPLETE")
      return {
        icon: <Check size={16} />,
        color: "bg-green-100 text-green-600",
      };
    if (type === "SLOT_FILLED")
      return { icon: <Camera size={16} />, color: "bg-blue-100 text-blue-600" };
    if (type === "NEW_TEMPLATE")
      return {
        icon: <Sparkles size={16} />,
        color: "bg-purple-100 text-purple-600",
      };
    return {
      icon: <UserPlus size={16} />,
      color: "bg-orange-100 text-orange-600",
    };
  };

  return (
    <div className="flex flex-col h-full bg-white pb-safe overflow-y-auto no-scrollbar relative">
      <StatusBar theme="dark" />
      <div className="px-4 pb-2 sticky top-0 bg-white/95 backdrop-blur-md z-10 border-b border-gray-100/50">
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
          <Button
            variant="ghost"
            size="sm"
            icon={Bell}
            onClick={() => setShowNotifications(true)}
            className="!p-2 rounded-full hover:bg-gray-100"
          />
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
                    ? tags.includes("그룹") || t.type === "DAYSHARE"
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
                    else if (t.type === "DAYSHARE") router.push("/day_share");
                    else router.push("/");
                  }}
                  isScrapped={isScrapped(t.type)}
                  onScrap={() => toggle(t.type)}
                />
              ));
            })()}
        </div>
      </div>

      {showNotifications && (
        <div className="absolute inset-0 z-50 bg-white animate-slide-left flex flex-col pb-safe">
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

          <div className="flex-1 overflow-y-auto p-2">
            {notifications.length > 0 ? (
              notifications.map((noti) => {
                const { icon, color } = notifIcon(noti.type);
                return (
                  <div
                    key={noti.id}
                    onClick={() => markRead.mutate(noti.id)}
                    className={`flex gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors cursor-pointer active:scale-[0.98] ${
                      !noti.read ? "bg-blue-50/30" : ""
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${color}`}
                    >
                      {icon}
                    </div>
                    <div className="flex-1 border-b border-gray-50 pb-4">
                      <p className="text-sm font-medium text-gray-900 leading-snug break-keep mb-1">
                        {noti.message}
                      </p>
                      <span className="text-xs font-bold text-gray-400">
                        {new Date(noti.createdAt).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Bell size={32} className="mb-3 opacity-20" />
                <p className="text-sm font-medium">새로운 알림이 없습니다</p>
              </div>
            )}

            <div className="pt-8 pb-12 flex flex-col items-center justify-center opacity-60">
              <div className="w-1 h-1 bg-gray-300 rounded-full mb-1"></div>
              <div className="w-1 h-1 bg-gray-300 rounded-full mb-1"></div>
              <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
              <span className="text-xs font-bold text-gray-400 mt-4">
                오래된 알림이 없습니다
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeScreen;
