"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { authService } from "@/lib/api/authService";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const code = searchParams.get("code");
    console.log("[OAuth Callback] code from URL:", code ? code.substring(0, 8) + "..." : null);
    if (!code) {
      console.error("[OAuth Callback] No code in URL → oauth_failed");
      router.replace("/login?error=oauth_failed");
      return;
    }
    authService
      .exchange(code)
      .then(({ accessToken }) => {
        console.log("[OAuth Callback] Exchange success, accessToken:", accessToken ? "received" : "missing");
        return login(accessToken);
      })
      .then(() => router.replace("/"))
      .catch((err) => {
        console.error("[OAuth Callback] Exchange failed:", err?.response?.status, err?.response?.data);
        router.replace("/login?error=oauth_failed");
      });
  }, [login, router, searchParams]);

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
