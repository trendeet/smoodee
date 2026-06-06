"use client";

import { Suspense } from "react";
import LoginScreen from "@/features/auth/components/LoginScreen";

export default function Page() {
  return (
    <Suspense>
      <LoginScreen />
    </Suspense>
  );
}
