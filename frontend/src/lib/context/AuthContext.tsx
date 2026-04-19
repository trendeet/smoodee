"use client";

import React, { createContext, useState, useContext, ReactNode, useEffect } from "react";
import { userService } from "@/lib/api/userService";
import { authService } from "@/lib/api/authService";
import { UserProfileResponse } from "@/lib/api/types";

const ACCESS_TOKEN_KEY = "smoodee_access_token";
const AVATAR_KEY = "smoodee_profile_avatar";

interface UserProfile {
  id?: number;
  name: string;
  email?: string;
  bio?: string;
  avatar?: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (stored) {
      setAccessToken(stored);
      setIsLoggedIn(true);
      // Fetch real profile from server
      userService
        .getProfile()
        .then((res) => setUserProfile(toUserProfile(res)))
        .catch(() => {
          // Token may be invalid — clean up
          localStorage.removeItem(ACCESS_TOKEN_KEY);
          setAccessToken(null);
          setIsLoggedIn(false);
        });
    }
  }, []);

  const login = async (token: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
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
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      setAccessToken(null);
      setIsLoggedIn(false);
      setUserProfile(null);
    }
  };

  const updateProfile = (profile: Partial<UserProfile>) => {
    if (profile.avatar) {
      if (profile.avatar.startsWith("data:") || profile.avatar.startsWith("bg-")) {
        // data URL → persist to localStorage; gradient class → clear saved avatar
        if (profile.avatar.startsWith("data:")) {
          localStorage.setItem(AVATAR_KEY, profile.avatar);
        } else {
          localStorage.removeItem(AVATAR_KEY);
        }
      }
    }
    setUserProfile((prev) => (prev ? { ...prev, ...profile } : { name: "User", ...profile }));
  };

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, userProfile, accessToken, login, logout, updateProfile }}
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
