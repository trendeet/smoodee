"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import apiClient from "@/lib/api/apiClient";

function CallbackHandler() {
  const router = useRouter();
  const { login } = useAuth();

  useEffect(() => {
    apiClient
      .get<{ data: { accessToken: string } }>("/api/v1/auth/token")
      .then(({ data }) => {
        login(data.data.accessToken);
        router.replace("/");
      })
      .catch(() => {
        router.replace("/login?error=oauth_failed");
      });
  }, [login, router]);

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
