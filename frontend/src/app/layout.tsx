import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import { AuthProvider } from "@/lib/context/AuthContext";
import { AppProvider } from "@/lib/context/AppContext";

export const metadata: Metadata = {
  title: "Trender",
  description: "클릭 몇 번이면 끝나는, 가장 부드러운 템플릿 제작 플로우.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <Providers>
          <AuthProvider>
            <AppProvider>
              {children}
            </AppProvider>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
