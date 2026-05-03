"use client";

import React, { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { UIProvider, useUI } from "@/lib/context/UIContext";
import SideMenu from "@/components/layout/SideMenu";
import Toast from "@/components/ui/Toast";

const GUIDE_SKIP_KEY = "smoodee_guide_skip_date";

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isMenuOpen, closeMenu, showSaveToast } = useUI();
  const router = useRouter();
  const pathname = usePathname();
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    if (pathname === "/guide") return;
    const today = new Date().toISOString().slice(0, 10);
    const skipDate = localStorage.getItem(GUIDE_SKIP_KEY);
    if (skipDate !== today) {
      router.replace("/guide");
    }
  }, [pathname, router]);

  return (
    <div className="h-[100dvh] w-full bg-[#F2F4F6] flex justify-center font-sans select-none overflow-hidden">
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
