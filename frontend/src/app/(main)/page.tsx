"use client";

import React, { useState } from "react";
import HomeScreen from "./screens/HomeScreen";
import MyPageScreen from "./screens/MyPageScreen";
import InProgressScreen from "./screens/InProgressScreen";
import RecentScreen from "./screens/RecentScreen";
import SettingsScreen from "./screens/SettingsScreen";
import GuideScreen from "./screens/GuideScreen";
import ColorWorkFlow from "@/features/colorwork/components/ColorWorkFlow";
import GroupDayFlow from "@/features/dayshare/components/GroupDayFlow";
import GroupScreen from "@/features/dayshare/components/GroupScreen";
import LoginScreen from "@/features/auth/components/LoginScreen";
import SignupScreen from "@/features/auth/components/SignupScreen";
import SideMenu from "@/components/layout/SideMenu";
import Toast from "@/components/ui/Toast";
import { INITIAL_GROUPS } from "@/lib/mock-data/groups";
import { INITIAL_IN_PROGRESS } from "@/lib/mock-data/sessions";

interface HistoryEntry {
  name: string;
  params: Record<string, any>;
}

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [history, setHistory] = useState<HistoryEntry[]>([{ name: "home", params: {} }]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [groups, setGroups] = useState(INITIAL_GROUPS);
  const [inProgressSessions, setInProgressSessions] = useState(INITIAL_IN_PROGRESS);
  const [scrappedTemplates, setScrappedTemplates] = useState<string[]>([]);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [userProfile, setUserProfile] = useState({
    name: "Guest User",
    bio: "안녕하세요! 오늘도 즐거운 기록 되세요 ✨",
    avatar: "bg-gradient-to-tr from-indigo-500 to-pink-500",
  });

  const currentScreen = history[history.length - 1];

  const toggleScrap = (id: string) => {
    setScrappedTemplates((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const navigateTo = (screenName: string, params: Record<string, any> = {}) => {
    if (["home", "mypage", "group", "recent", "settings", "inprogress"].includes(screenName)) {
      setActiveTab(screenName);
      setIsMenuOpen(false);
      if (screenName !== "group") setSelectedGroup(null);
      setHistory([{ name: screenName, params }]);
    } else {
      setHistory((prev) => [...prev, { name: screenName, params }]);
    }
  };

  const handleCreateGroup = (newGroup: any) => {
    setGroups((prev) => [newGroup, ...prev]);
    setActiveTab("group");
    setSelectedGroup(newGroup);
    setHistory([{ name: "group", params: {} }]);
  };

  const handleSaveSession = (sessionData: any) => {
    setInProgressSessions((prev) => {
      const existingIdx = prev.findIndex((s) => s.id === sessionData.id);
      if (existingIdx >= 0) {
        const newArr = [...prev];
        newArr[existingIdx] = sessionData;
        return newArr;
      }
      return [sessionData, ...prev];
    });
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 2000);
  };

  const handleLogin = (userInfo: { name: string; email?: string }) => {
    setIsLoggedIn(true);
    setUserProfile((prev) => ({ ...prev, name: userInfo.name }));
    navigateTo("home");
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setIsMenuOpen(false);
    navigateTo("home");
  };

  const goBack = () => {
    if (history.length > 1) {
      setHistory((prev) => prev.slice(0, -1));
    }
  };

  const renderScreen = () => {
    const { name, params } = currentScreen;

    switch (name) {
      case "home":
        return (
          <HomeScreen
            navigateTo={navigateTo}
            activeTab="home"
            onOpenMenu={() => setIsMenuOpen(true)}
            scrappedTemplates={scrappedTemplates}
            toggleScrap={toggleScrap}
          />
        );
      case "mypage":
        return (
          <MyPageScreen
            onBack={goBack}
            activeTab="mypage"
            onOpenMenu={() => setIsMenuOpen(true)}
            navigateTo={navigateTo}
            scrappedTemplates={scrappedTemplates}
            userProfile={userProfile}
            onUpdateProfile={setUserProfile}
          />
        );
      case "inprogress":
        return (
          <InProgressScreen
            activeTab="inprogress"
            onOpenMenu={() => setIsMenuOpen(true)}
            sessions={inProgressSessions}
            onResume={(session: any) => navigateTo("colorwork", { session })}
            groups={groups}
            onGroupSelect={(group: any) => {
              setSelectedGroup(group);
              navigateTo("group");
            }}
            navigateTo={navigateTo}
          />
        );
      case "group":
        return (
          <GroupScreen
            navigateTo={navigateTo}
            activeTab="group"
            onOpenMenu={() => setIsMenuOpen(true)}
            groups={groups}
            setGroups={setGroups}
            onGroupSelect={setSelectedGroup}
            selectedGroup={selectedGroup}
            onBackToList={() => {
              setSelectedGroup(null);
              navigateTo("inprogress");
            }}
          />
        );
      case "recent":
        return (
          <RecentScreen
            navigateTo={navigateTo}
            activeTab="recent"
            onOpenMenu={() => setIsMenuOpen(true)}
          />
        );
      case "settings":
        return <SettingsScreen onBack={goBack} activeTab="settings" />;
      case "colorwork":
        return (
          <ColorWorkFlow
            onBack={goBack}
            navigateTo={navigateTo}
            initialSession={params?.session}
            onSaveSession={handleSaveSession}
          />
        );
      case "day_share":
        return (
          <GroupDayFlow
            onBack={goBack}
            onCreateGroup={handleCreateGroup}
            template={params?.template}
          />
        );
      case "guide":
        return <GuideScreen onBack={goBack} />;
      case "login":
        return (
          <LoginScreen
            onBack={goBack}
            onLoginSuccess={handleLogin}
            navigateTo={navigateTo}
          />
        );
      case "signup":
        return <SignupScreen onBack={goBack} onSignupSuccess={handleLogin} />;
      default:
        return (
          <HomeScreen
            navigateTo={navigateTo}
            activeTab="home"
            onOpenMenu={() => setIsMenuOpen(true)}
            scrappedTemplates={scrappedTemplates}
            toggleScrap={toggleScrap}
          />
        );
    }
  };

  return (
    <div className="h-screen w-full bg-[#F2F4F6] flex justify-center font-sans select-none overflow-hidden">
      <div className="w-full max-w-[420px] h-full bg-white shadow-2xl relative flex flex-col">
        <SideMenu
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          activeTab={activeTab}
          onNavigate={navigateTo}
          isLoggedIn={isLoggedIn}
          onLogout={handleLogout}
          userProfile={userProfile}
        />
        {showSaveToast && <Toast message="임시저장 되었습니다!" />}
        <main className="flex-1 relative overflow-hidden bg-white mt-0">
          {renderScreen()}
        </main>
      </div>
    </div>
  );
}
