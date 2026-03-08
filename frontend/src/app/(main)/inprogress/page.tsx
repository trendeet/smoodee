"use client";

import React, { useState } from "react";
import {
  Menu,
  Plus,
  User,
  Users,
  FolderClock,
  X,
  Image as ImageIcon,
} from "lucide-react";
import StatusBar from "@/components/ui/StatusBar";
import Toast from "@/components/ui/Toast";
import TemplateCard from "@/features/templates/components/TemplateCard";
import { MOCK_TEMPLATES } from "@/lib/mock-data/templates";
import { Group } from "@/lib/mock-data/groups";
import { InProgressSession } from "@/lib/mock-data/sessions";

interface InProgressScreenProps {
  activeTab: string;
  onOpenMenu: () => void;
  sessions: InProgressSession[];
  onResume: (session: InProgressSession) => void;
  groups: Group[];
  onGroupSelect: (group: Group) => void;
  navigateTo: (screen: string, params?: any) => void;
}

const InProgressScreen = ({
  activeTab,
  onOpenMenu,
  sessions,
  onResume,
  groups,
  onGroupSelect,
  navigateTo,
}: InProgressScreenProps) => {
  const [subTab, setSubTab] = useState("personal");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showArchiveToast, setShowArchiveToast] = useState(false);

  if (activeTab !== "inprogress") return null;

  return (
    <div className="flex flex-col h-full bg-white pb-safe overflow-y-auto no-scrollbar relative">
      <StatusBar theme="dark" />
      {showArchiveToast && <Toast message="보관함으로 이동되었습니다!" />}
      <div className="px-4 pt-4 pb-2 sticky top-0 bg-white/95 backdrop-blur-md z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenMenu}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">
              진행 중인 템플릿
            </h1>
          </div>
          {subTab === "group" && (
            <button
              onClick={() => setShowTemplateModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-xs font-bold rounded-full shadow-lg active:scale-95 transition-transform"
            >
              <Plus size={14} />
              <span>만들기</span>
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSubTab("personal")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
              subTab === "personal"
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            <User size={14} />
            개인
          </button>
          <button
            onClick={() => setSubTab("group")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
              subTab === "group"
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            <Users size={14} />
            그룹
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {subTab === "personal" ? (
          sessions.length > 0 ? (
            sessions.map((session) => {
              const filledCount = session.slots.filter(Boolean).length;
              const progressPercentage = (filledCount / session.gridSize) * 100;

              return (
                <div
                  key={session.id}
                  onClick={() => onResume(session)}
                  className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group active:scale-[0.98]"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl bg-gradient-to-br ${session.selectedColor.gradient} shadow-inner`}
                      >
                        <ImageIcon className="text-white/80" size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 leading-tight">
                          {session.title}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          무드: {session.selectedColor.name}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
                      {session.lastModified}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-gray-500">
                      <span>진행률</span>
                      <span className="text-blue-500">
                        {filledCount} / {session.gridSize}장
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                        style={{ width: `${progressPercentage}%` }}
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
        ) : groups.length > 0 ? (
          groups.map((group) => (
            <div
              key={group.id}
              onClick={() => onGroupSelect(group)}
              className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group active:scale-[0.98]"
            >
              <div className="flex justify-between items-start mb-3">
                <div
                  className={`w-12 h-12 ${group.theme} rounded-2xl flex items-center justify-center text-2xl`}
                >
                  {group.icon}
                </div>
                <div className="flex -space-x-2">
                  {[...Array(Math.min(3, group.members))].map((_, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full border-2 border-white bg-gray-200"
                    />
                  ))}
                  {group.members > 3 && (
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                      +{group.members - 3}
                    </div>
                  )}
                </div>
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-1">
                {group.title}
              </h3>
              <p className="text-xs text-gray-500 mb-4">{group.description}</p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-gray-400">
                  <span>진행률</span>
                  <span className="text-black">{group.progress}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000"
                    style={{ width: `${group.progress}%` }}
                  />
                </div>
              </div>

              {group.progress === 100 && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col items-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowArchiveToast(true);
                      setTimeout(() => {
                        setShowArchiveToast(false);
                      }, 1500);
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
          ))
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

      {showTemplateModal && (
        <div
          className="absolute inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowTemplateModal(false)}
        >
          <div
            className="bg-white w-full max-w-[420px] rounded-t-3xl p-6 pb-safe animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-black">
                  어떤 그룹을 만들어볼까요?
                </h2>
                <p className="text-sm text-gray-500 font-medium mt-1">
                  함께할 템플릿을 선택해주세요.
                </p>
              </div>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 pb-4">
              {MOCK_TEMPLATES.filter((t) => t.type === "Group").map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  onClick={() => {
                    setShowTemplateModal(false);
                    navigateTo("day_share", { template: t });
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InProgressScreen;
