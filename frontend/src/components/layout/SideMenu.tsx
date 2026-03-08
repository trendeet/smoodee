import React from "react";
import { Home, Clock, X, User, LogOut, Lock, FolderClock } from "lucide-react";

interface UserProfile {
  name?: string;
  avatar?: string;
  bio?: string;
}

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onNavigate: (screen: string, params?: any) => void;
  isLoggedIn: boolean;
  onLogout: () => void;
  userProfile?: UserProfile | null;
}

const SideMenu = ({
  isOpen,
  onClose,
  activeTab,
  onNavigate,
  isLoggedIn,
  onLogout,
  userProfile,
}: SideMenuProps) => {
  if (!isOpen) return null;

  const menuItems = [
    { id: "home", icon: Home, label: "홈", public: true },
    {
      id: "inprogress",
      icon: FolderClock,
      label: "진행 중인 템플릿",
      public: false,
    },
    { id: "recent", icon: Clock, label: "보관함", public: false },
  ];

  const handleItemClick = (item: { id: string; public: boolean }) => {
    if (!item.public && !isLoggedIn) {
      onClose();
      onNavigate("login");
    } else {
      onNavigate(item.id);
    }
  };

  const handleLoginClick = () => {
    onClose();
    onNavigate("login");
  };

  return (
    <div className="absolute inset-0 z-[100] flex">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative bg-white h-full shadow-2xl flex flex-col animate-drawer-slide overflow-hidden">
        <div className="min-w-[280px] w-[280px] flex flex-col h-full">
          <div className="p-6 pt-12 pb-8">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold text-lg">
                  T
                </div>
                <h2 className="text-xl font-black tracking-tight">
                  TemplateApp
                </h2>
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

          <div className="mt-auto p-6 border-t border-gray-100">
            {isLoggedIn ? (
              <div
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100"
                onClick={() => onNavigate("mypage")}
              >
                {userProfile?.avatar?.includes("http") ? (
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
                    onLogout();
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
                  onClick={handleLoginClick}
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
