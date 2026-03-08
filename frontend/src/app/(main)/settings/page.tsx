"use client";

import React, { useState } from "react";
import { ChevronLeft, Bell, Moon, Shield, Trash2, ChevronRight } from "lucide-react";
import StatusBar from "@/components/ui/StatusBar";
import Switch from "@/components/ui/Switch";

interface SettingsScreenProps {
  activeTab: string;
  onBack: () => void;
}

const SettingsScreen = ({ activeTab, onBack }: SettingsScreenProps) => {
  if (activeTab !== "settings") return null;
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
  });
  const toggleSetting = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  return (
    <div className="flex flex-col h-full bg-[#F2F4F6] pb-safe overflow-y-auto no-scrollbar relative animate-slide-left">
      <StatusBar theme="dark" />
      <div className="px-4 py-3 flex items-center gap-3 sticky top-0 bg-white/95 backdrop-blur-md z-10 border-b border-gray-100/50">
        <button
          onClick={onBack}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold tracking-tight text-gray-900">설정</h1>
      </div>
      <div className="p-4 space-y-6">
        <section>
          <h3 className="text-xs font-bold text-gray-500 mb-2 ml-1">앱 설정</h3>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between p-4 border-b border-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Bell size={18} />
                </div>
                <span className="font-bold text-sm text-gray-700">알림</span>
              </div>
              <Switch
                checked={settings.notifications}
                onChange={() => toggleSetting("notifications")}
              />
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Moon size={18} />
                </div>
                <span className="font-bold text-sm text-gray-700">
                  다크 모드
                </span>
              </div>
              <Switch
                checked={settings.darkMode}
                onChange={() => toggleSetting("darkMode")}
              />
            </div>
          </div>
        </section>
        <section>
          <h3 className="text-xs font-bold text-gray-500 mb-2 ml-1">
            정보 및 계정
          </h3>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <button className="w-full flex items-center justify-between p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-50 text-gray-600 flex items-center justify-center">
                  <Shield size={18} />
                </div>
                <span className="font-bold text-sm text-gray-700">
                  개인정보 처리방침
                </span>
              </div>
              <ChevronRight size={18} className="text-gray-400" />
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-red-50 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center group-hover:bg-red-100">
                  <Trash2 size={18} />
                </div>
                <span className="font-bold text-sm text-red-500">회원탈퇴</span>
              </div>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsScreen;
