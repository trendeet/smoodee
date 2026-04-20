"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Settings, User, Camera, Edit3, Heart } from "lucide-react";
import StatusBar from "@/components/ui/StatusBar";
import TemplateCard from "@/features/templates/components/TemplateCard";
import { useAuth } from "@/lib/context/AuthContext";
import { useUI } from "@/lib/context/UIContext";
import { useScraps } from "@/hooks/useScraps";
import { useTemplates } from "@/hooks/useTemplates";
import { useProjects } from "@/hooks/useProjects";
import { userService } from "@/lib/api/userService";

const MyPageScreen = () => {
  const router = useRouter();
  const { userProfile, updateProfile } = useAuth();
  const { openMenu } = useUI();
  const { data: scraps = [] } = useScraps();
  const { data: allTemplates = [] } = useTemplates();
  const { data: groupProjects = [] } = useProjects({ type: "GROUP", tab: "IN_PROGRESS" });

  const savedItems = allTemplates.filter((t) =>
    scraps.some((s) => s.templateType === t.type)
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(userProfile?.name || "Guest User");
  const [editBio, setEditBio] = useState(userProfile?.bio || "");
  const [editAvatar, setEditAvatar] = useState(
    userProfile?.avatar || "bg-gradient-to-tr from-indigo-500 to-pink-500"
  );
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let avatarToSave = editAvatar;
      if (pendingFile) {
        const uploadedUrl = await userService.uploadAvatar(pendingFile);
        avatarToSave = uploadedUrl;
        setPendingFile(null);
        // clear any previously stored local avatar
        localStorage.removeItem("smoodee_profile_avatar");
      }
      await userService.updateProfile({ name: editName, bio: editBio });
      updateProfile({ name: editName, bio: editBio, avatar: avatarToSave });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddImage = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setEditAvatar(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleDefaultImage = () => {
    setPendingFile(null);
    setEditAvatar("bg-gradient-to-tr from-indigo-500 to-pink-500");
  };

  return (
    <div className="flex flex-col h-full bg-white pb-safe overflow-y-auto no-scrollbar relative">
      <StatusBar theme="dark" />

      <div className="px-4 py-3 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={openMenu}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-xl font-black tracking-tight">마이페이지</h1>
        </div>
        <button
          onClick={() => router.push("/settings")}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <Settings size={20} />
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="px-6 pt-4 pb-8">
        {isEditing ? (
          <div className="flex flex-col items-center animate-fade-in w-full">
            <div className="mb-6 relative">
              {editAvatar.startsWith("http") || editAvatar.startsWith("data:") ? (
                <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-gray-50 shadow-sm">
                  <img
                    src={editAvatar}
                    alt="Profile preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div
                  className={`w-24 h-24 rounded-full ${editAvatar} p-1 shadow-sm`}
                >
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                    <User size={48} className="text-gray-300" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mb-8 w-full max-w-[240px]">
              <button
                onClick={handleDefaultImage}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                  !editAvatar.startsWith("http") && !editAvatar.startsWith("data:")
                    ? "bg-black text-white border-black shadow-md"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                기본 이미지
              </button>
              <button
                onClick={handleAddImage}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                  editAvatar.startsWith("http") || editAvatar.startsWith("data:")
                    ? "bg-black text-white border-black shadow-md"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                <Camera size={14} />
                이미지 추가
              </button>
            </div>

            <div className="w-full space-y-3 mb-6">
              <div>
                <label className="text-xs font-bold text-gray-500 ml-1">
                  이름
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-black/10 transition-all mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 ml-1">
                  소개
                </label>
                <input
                  type="text"
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm text-center focus:outline-none focus:ring-2 focus:ring-black/10 transition-all mt-1"
                />
              </div>
            </div>

            <div className="flex gap-3 w-full mb-4">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-60"
              >
                {isSaving ? "저장 중..." : "저장 완료"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center animate-fade-in">
            <div className="relative mb-4">
              {userProfile?.avatar?.startsWith("http") || userProfile?.avatar?.startsWith("data:") ? (
                <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-gray-50 shadow-sm">
                  <img
                    src={userProfile.avatar}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div
                  className={`w-24 h-24 rounded-full ${
                    userProfile?.avatar ||
                    "bg-gradient-to-tr from-indigo-500 to-pink-500"
                  } p-1`}
                >
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                    <User size={48} className="text-gray-300" />
                  </div>
                </div>
              )}
              <button
                onClick={() => setIsEditing(true)}
                className="absolute bottom-0 right-0 p-2 bg-black text-white rounded-full shadow-lg border-2 border-white hover:bg-gray-800"
              >
                <Edit3 size={14} />
              </button>
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-1">
              {userProfile?.name || "Guest User"}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {userProfile?.bio || "안녕하세요! 오늘도 즐거운 기록 되세요 ✨"}
            </p>

            <div className="flex gap-4 w-full">
              <div className="flex-1 bg-gray-50 rounded-2xl p-4 flex flex-col items-center">
                <span className="text-2xl font-black text-gray-900">
                  {savedItems.length}
                </span>
                <span className="text-xs text-gray-500 font-bold">스크랩</span>
              </div>
              <div className="flex-1 bg-gray-50 rounded-2xl p-4 flex flex-col items-center">
                <span className="text-2xl font-black text-gray-900">{groupProjects.length}</span>
                <span className="text-xs text-gray-500 font-bold">
                  참여 그룹
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 pb-24">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Heart size={18} className="text-red-500" fill="currentColor" />
          스크랩한 템플릿
        </h3>

        {savedItems.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {savedItems.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onClick={() => {
                  if (t.type === "COLORWORK") router.push("/colorwork");
                  else if (t.type === "DAY_SHARE") router.push("/day_share");
                }}
                isScrapped={true}
              />
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
              <Heart size={20} className="text-gray-300" />
            </div>
            <p className="text-sm font-bold text-gray-600">
              스크랩한 템플릿이 없어요
            </p>
            <p className="text-xs text-gray-400 mt-1">
              홈에서 마음에 드는 템플릿의
              <br />
              하트를 눌러보세요!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPageScreen;
