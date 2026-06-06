"use client";

import { Suspense } from "react";
import ManittoWorld from "@/features/manitto/ManittoWorld";

export default function ManittoPage() {
  return (
    <Suspense fallback={<div className="h-full flex items-center justify-center"><div className="w-8 h-8 border-4 border-black border-t-[#E9967A] rounded-full animate-spin" /></div>}>
      <ManittoWorld />
    </Suspense>
  );
}
