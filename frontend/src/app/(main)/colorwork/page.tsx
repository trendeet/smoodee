"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ColorWorkFlow from "@/features/colorwork/components/ColorWorkFlow";
import ColorWorkResumeFlow from "@/features/colorwork/components/ColorWorkResumeFlow";

function ColorWorkRouter() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get("projectId");
  const stepParam = searchParams.get("step");

  if (projectIdParam) {
    return (
      <ColorWorkResumeFlow
        projectId={parseInt(projectIdParam, 10)}
        initialStep={stepParam === "4" ? 4 : undefined}
      />
    );
  }
  return <ColorWorkFlow />;
}

export default function Page() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center text-gray-400 text-sm">불러오는 중...</div>}>
      <ColorWorkRouter />
    </Suspense>
  );
}
