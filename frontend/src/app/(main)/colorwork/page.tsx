"use client";

import { Suspense } from "react";
import ColorWorkFlow from "@/features/colorwork/components/ColorWorkFlow";

export default function Page() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center text-gray-400 text-sm">불러오는 중...</div>}>
      <ColorWorkFlow />
    </Suspense>
  );
}
