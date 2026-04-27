"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    const token = searchParams.get("accessToken");
    if (token) {
      login(token);
      router.replace("/");
    } else {
      router.replace("/login?error=oauth_failed");
    }
  }, [searchParams, login, router]);

  return (
    <div className="flex h-[100dvh] items-center justify-center">
      <p className="text-sm text-gray-500">로그인 처리 중...</p>
    </div>
  );
}

export default function OAuth2CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[100dvh] items-center justify-center">
          <p className="text-sm text-gray-500">로그인 처리 중...</p>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
