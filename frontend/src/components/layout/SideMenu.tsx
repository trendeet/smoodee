"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Home, Clock, X, User, LogOut, Lock, FolderClock } from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const SideMenu = ({ isOpen, onClose }: SideMenuProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn, userProfile, logout } = useAuth();

  if (!isOpen) return null;

  const activeTab =
    pathname === "/"
      ? "home"
      : pathname.startsWith("/inprogress")
      ? "inprogress"
      : pathname.startsWith("/recent")
      ? "recent"
      : "";

  const menuItems = [
    { id: "home", path: "/", icon: Home, label: "홈", public: true },
    {
      id: "inprogress",
      path: "/inprogress",
      icon: FolderClock,
      label: "진행 중인 활동",
      public: false,
    },
    {
      id: "recent",
      path: "/recent",
      icon: Clock,
      label: "보관함",
      public: false,
    },
  ];

  const handleItemClick = (item: { path: string; public: boolean }) => {
    onClose();
    if (!item.public && !isLoggedIn) {
      router.push("/login");
    } else {
      router.push(item.path);
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
    router.push("/");
  };

  return (
    <div className="absolute inset-0 z-[100] flex">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative bg-white h-full shadow-2xl flex flex-col animate-drawer-slide overflow-hidden">
        <div className="min-w-[280px] w-[280px] flex flex-col h-full overflow-y-auto">
          <div className="p-6 pt-12 pb-8">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold text-lg">
                  S
                </div>
                <h2 className="text-xl font-black tracking-tight">Smoodee</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all ${
                    activeTab === item.id
                      ? "bg-black text-white shadow-lg"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <item.icon size={20} />
                    <span className="font-bold text-sm">{item.label}</span>
                  </div>
                  {!item.public && !isLoggedIn && (
                    <Lock size={14} className="text-gray-400" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto p-6 pb-[max(24px,env(safe-area-inset-bottom))] border-t border-gray-100">
            {isLoggedIn ? (
              <div
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100"
                onClick={() => {
                  onClose();
                  router.push("/mypage");
                }}
              >
                {userProfile?.avatar?.startsWith("http") ||
                userProfile?.avatar?.startsWith("data:") ? (
                  <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-indigo-100 shrink-0">
                    <img
                      src={userProfile.avatar}
                      alt="profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className={`w-10 h-10 rounded-full ${
                      userProfile?.avatar ||
                      "bg-gradient-to-tr from-indigo-500 to-purple-500"
                    } p-[2px] shrink-0`}
                  >
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                      <User size={18} className="text-gray-600" />
                    </div>
                  </div>
                )}
                <div className="flex-1 overflow-hidden">
                  <p className="font-bold text-sm truncate">
                    {userProfile?.name || "Guest User"}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLogout();
                  }}
                  className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <User size={18} className="text-gray-400" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">
                      로그인이 필요합니다
                    </p>
                    <p className="text-[10px] text-gray-500">
                      더 많은 기능을 이용해보세요
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    router.push("/login");
                  }}
                  className="w-full py-3 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors"
                >
                  로그인 / 회원가입
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SideMenu;
