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
import StatusBar from "@/components/ui/StatusBar";
import Button from "@/components/ui/Button";
import TemplateCard from "@/features/templates/components/TemplateCard";
import { MOCK_TEMPLATES } from "@/lib/mock-data/templates";
import useTimeout from "@/hooks/useTimeout";

interface HomeScreenProps {
  navigateTo: (screen: string, params?: any) => void;
  activeTab: string;
  onOpenMenu: () => void;
  scrappedTemplates: string[];
  toggleScrap: (id: string) => void;
}

const HomeScreen = ({
  navigateTo,
  activeTab,
  onOpenMenu,
  scrappedTemplates,
  toggleScrap,
}: HomeScreenProps) => {
  const [filter, setFilter] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);

  useTimeout(() => setIsLoading(false), 1200);
  const filters = ["All", "Story", "Feed", "Group", "Trending"];

  const notifications = [
    {
      id: 1,
      type: "success",
      icon: <Check size={16} />,
      color: "bg-green-100 text-green-600",
      text: "'모닝루틴 인증 ☀️' 그룹이 100% 달성되었어요! 지금 보관함으로 옮길 수 있습니다.",
      time: "10분 전",
    },
    {
      id: 2,
      type: "activity",
      icon: <Camera size={16} />,
      color: "bg-blue-100 text-blue-600",
      text: "김대리님이 '점심 기록방 🍱'에 오늘의 점심을 인증했습니다.",
      time: "1시간 전",
    },
    {
      id: 3,
      type: "system",
      icon: <Sparkles size={16} />,
      color: "bg-purple-100 text-purple-600",
      text: "새로운 트렌딩 템플릿 '겨울 바다 무드'가 추가되었습니다. 구경해보세요!",
      time: "3시간 전",
    },
    {
      id: 4,
      type: "group",
      icon: <UserPlus size={16} />,
      color: "bg-orange-100 text-orange-600",
      text: "'하루 공유' 그룹에 새로운 멤버 '갓생'님이 참여했습니다.",
      time: "1일 전",
    },
  ];

  if (activeTab !== "home") return null;

  return (
    <div className="flex flex-col h-full bg-white pb-safe overflow-y-auto no-scrollbar relative">
      <StatusBar theme="dark" />
      <div className="px-4 pb-2 sticky top-0 bg-white/95 backdrop-blur-md z-10 border-b border-gray-100/50">
        <div className="flex items-center justify-between mb-3 pt-1">
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenMenu}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">
              Templates
            </h1>
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
          onClick={() => navigateTo("guide")}
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
          {filter === "All" ? "이번 주 인기" : `${filter} 템플릿`}
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {isLoading
            ? Array(4)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="aspect-[4/5] bg-gray-100 rounded-2xl animate-pulse" />
                    <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
                    <div className="h-3 bg-gray-100 rounded w-1/2 animate-pulse" />
                  </div>
                ))
            : MOCK_TEMPLATES.filter(
                (t) => filter === "All" || t.tags.includes(filter)
              ).map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  onClick={() => {
                    if (t.id === "t1") navigateTo("colorwork");
                    else if (t.id === "t_day") navigateTo("day_share");
                    else navigateTo("detail", t);
                  }}
                  isScrapped={scrappedTemplates.includes(t.id)}
                  onScrap={toggleScrap}
                />
              ))}
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
            {notifications.map((noti) => (
              <div
                key={noti.id}
                className="flex gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors cursor-pointer active:scale-[0.98]"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${noti.color}`}
                >
                  {noti.icon}
                </div>
                <div className="flex-1 border-b border-gray-50 pb-4">
                  <p className="text-sm font-medium text-gray-900 leading-snug break-keep mb-1">
                    {noti.text}
                  </p>
                  <span className="text-xs font-bold text-gray-400">
                    {noti.time}
                  </span>
                </div>
              </div>
            ))}

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
