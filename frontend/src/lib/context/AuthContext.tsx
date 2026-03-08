"use client";

import React, { createContext, useState, useContext, ReactNode } from "react";

interface UserProfile {
  name: string;
  email?: string;
  bio?: string;
  avatar?: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  userProfile: UserProfile | null;
  login: (userInfo: UserProfile) => void;
  logout: () => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>({
    name: "Guest User",
    bio: "안녕하세요! 오늘도 즐거운 기록 되세요 ✨",
    avatar: "bg-gradient-to-tr from-indigo-500 to-pink-500",
  });

  const login = (userInfo: UserProfile) => {
    setIsLoggedIn(true);
    setUserProfile((prev) => ({ ...prev, ...userInfo }));
  };

  const logout = () => {
    setIsLoggedIn(false);
  };

  const updateProfile = (profile: Partial<UserProfile>) => {
    setUserProfile((prev) => (prev ? { ...prev, ...profile } : null));
  };

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, userProfile, login, logout, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
