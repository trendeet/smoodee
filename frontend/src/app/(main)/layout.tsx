"use client";

import React from "react";
import { UIProvider, useUI } from "@/lib/context/UIContext";
import SideMenu from "@/components/layout/SideMenu";
import Toast from "@/components/ui/Toast";

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isMenuOpen, closeMenu, showSaveToast } = useUI();

  return (
    <div className="h-screen w-full bg-[#F2F4F6] flex justify-center font-sans select-none overflow-hidden">
      <div className="w-full max-w-[420px] h-full bg-white shadow-2xl relative flex flex-col">
        <SideMenu isOpen={isMenuOpen} onClose={closeMenu} />
        {showSaveToast && <Toast message="임시저장 되었습니다!" />}
        <main className="flex-1 relative overflow-hidden bg-white">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <UIProvider>
      <LayoutContent>{children}</LayoutContent>
    </UIProvider>
  );
}
