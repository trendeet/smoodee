"use client";

import React, { createContext, useState, useContext, ReactNode, useEffect } from "react";

const ACCESS_TOKEN_KEY = "smoodee_access_token";

interface UserProfile {
  name: string;
  email?: string;
  bio?: string;
  avatar?: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  userProfile: UserProfile | null;
  accessToken: string | null;
  login: (token: string, userInfo?: Partial<UserProfile>) => void;
  logout: () => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (stored) {
      setAccessToken(stored);
      setIsLoggedIn(true);
    }
  }, []);

  const login = (token: string, userInfo?: Partial<UserProfile>) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    setAccessToken(token);
    setIsLoggedIn(true);
    setUserProfile((prev) => ({
      name: "User",
      ...prev,
      ...userInfo,
    }));
  };

  const logout = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    setAccessToken(null);
    setIsLoggedIn(false);
    setUserProfile(null);
  };

  const updateProfile = (profile: Partial<UserProfile>) => {
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
