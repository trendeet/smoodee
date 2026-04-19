"use client";

import React, { createContext, useState, useContext, ReactNode } from "react";

interface UIContextType {
  isMenuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  showSaveToast: boolean;
  triggerSaveToast: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider = ({ children }: { children: ReactNode }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);

  const openMenu = () => setIsMenuOpen(true);
  const closeMenu = () => setIsMenuOpen(false);
  const triggerSaveToast = () => {
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 2000);
  };

  return (
    <UIContext.Provider value={{ isMenuOpen, openMenu, closeMenu, showSaveToast, triggerSaveToast }}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = (): UIContextType => {
  const context = useContext(UIContext);
  if (!context) throw new Error("useUI must be used within a UIProvider");
  return context;
};

export default UIContext;
