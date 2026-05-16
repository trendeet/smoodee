import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";
import { AuthProvider } from "@/lib/context/AuthContext";
import { AppProvider } from "@/lib/context/AppContext";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Trender",
  description: "클릭 몇 번이면 끝나는, 가장 부드러운 템플릿 제작 플로우.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://smoodee-dev.s3.ap-northeast-2.amazonaws.com" />
        <link rel="dns-prefetch" href="https://smoodee-dev.s3.ap-northeast-2.amazonaws.com" />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <Providers>
          <AuthProvider>
            <AppProvider>
              {children}
            </AppProvider>
          </AuthProvider>
        </Providers>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
