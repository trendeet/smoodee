"use client";

import React, { createContext, useState, useContext, ReactNode, useEffect } from "react";
import { userService } from "@/lib/api/userService";
import { authService } from "@/lib/api/authService";
import { tokenStore } from "@/lib/api/tokenStore";
import { UserProfileResponse } from "@/lib/api/types";

const AVATAR_KEY = "smoodee_profile_avatar";
const SESSION_KEY = "smoodee_has_session";

interface UserProfile {
  id?: number;
  name: string;
  email?: string;
  bio?: string;
  avatar?: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  isInitializing: boolean;
  userProfile: UserProfile | null;
  accessToken: string | null;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toUserProfile(res: UserProfileResponse): UserProfile {
  const savedAvatar = localStorage.getItem(AVATAR_KEY);
  return {
    id: res.id,
    name: res.name,
    email: res.email,
    bio: res.bio,
    avatar: savedAvatar || res.avatarUrl,
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // 앱 시작 시 refreshToken 쿠키로 accessToken 복원 (이전 세션 힌트가 있을 때만)
  useEffect(() => {
    if (!localStorage.getItem(SESSION_KEY)) {
      setIsInitializing(false);
      return;
    }
    authService
      .refresh()
      .then(({ accessToken: token }) => {
        tokenStore.set(token);
        setAccessToken(token);
        setIsLoggedIn(true);
        return userService.getProfile();
      })
      .then((res) => setUserProfile(toUserProfile(res)))
      .catch(() => {
        localStorage.removeItem(SESSION_KEY);
        tokenStore.set(null);
        setAccessToken(null);
        setIsLoggedIn(false);
      })
      .finally(() => setIsInitializing(false));
  }, []);

  const login = async (token: string) => {
    localStorage.setItem(SESSION_KEY, "1");
    tokenStore.set(token);
    setAccessToken(token);
    setIsLoggedIn(true);
    try {
      const res = await userService.getProfile();
      setUserProfile(toUserProfile(res));
    } catch {
      setUserProfile({ name: "User" });
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // ignore
    } finally {
      localStorage.removeItem(SESSION_KEY);
      tokenStore.set(null);
      setAccessToken(null);
      setIsLoggedIn(false);
      setUserProfile(null);
    }
  };

  const updateProfile = (profile: Partial<UserProfile>) => {
    if (profile.avatar) {
      if (profile.avatar.startsWith("data:")) {
        localStorage.setItem(AVATAR_KEY, profile.avatar);
      } else if (profile.avatar.startsWith("bg-")) {
        localStorage.removeItem(AVATAR_KEY);
      }
    }
    setUserProfile((prev) => (prev ? { ...prev, ...profile } : { name: "User", ...profile }));
  };

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, isInitializing, userProfile, accessToken, login, logout, updateProfile }}
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
