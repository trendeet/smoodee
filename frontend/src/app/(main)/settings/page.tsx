"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Bell, Moon, Shield, Trash2, ChevronRight, LogOut } from "lucide-react";
import StatusBar from "@/components/ui/StatusBar";
import Switch from "@/components/ui/Switch";
import { useAuth } from "@/lib/context/AuthContext";
import { userService } from "@/lib/api/userService";

const SettingsScreen = () => {
  const router = useRouter();
  const { logout } = useAuth();
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
  });

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  const handleDeleteAccount = async () => {
    if (!confirm("정말 탈퇴하시겠습니까? 모든 데이터가 삭제됩니다.")) return;
    await userService.deleteAccount();
    await logout();
    router.replace("/");
  };

  return (
    <div className="flex flex-col h-full bg-[#F2F4F6] pb-safe overflow-y-auto no-scrollbar relative animate-slide-left">
      <StatusBar theme="dark" />
      <div className="px-4 py-3 flex items-center gap-3 sticky top-0 bg-white/95 backdrop-blur-md z-10 border-b border-gray-100/50">
        <button
          onClick={() => router.back()}
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
            <div className="flex items-center justify-between p-4 border-b border-gray-50 opacity-40">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Bell size={18} />
                </div>
                <div>
                  <span className="font-bold text-sm text-gray-700">알림</span>
                  <p className="text-xs text-gray-400">준비 중인 기능이에요</p>
                </div>
              </div>
              <Switch checked={false} onChange={() => {}} disabled />
            </div>
            <div className="flex items-center justify-between p-4 opacity-40">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Moon size={18} />
                </div>
                <div>
                  <span className="font-bold text-sm text-gray-700">다크 모드</span>
                  <p className="text-xs text-gray-400">준비 중인 기능이에요</p>
                </div>
              </div>
              <Switch checked={false} onChange={() => {}} disabled />
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
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-between p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-50 text-gray-600 flex items-center justify-center">
                  <LogOut size={18} />
                </div>
                <span className="font-bold text-sm text-gray-700">로그아웃</span>
              </div>
            </button>
            <button
              onClick={handleDeleteAccount}
              className="w-full flex items-center justify-between p-4 hover:bg-red-50 transition-colors group"
            >
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
