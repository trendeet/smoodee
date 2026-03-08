import React, { useState } from "react";
import { ChevronLeft } from "lucide-react";
import StatusBar from "@/components/ui/StatusBar";

interface UserInfo {
  name: string;
  email: string;
}

interface LoginScreenProps {
  onBack: () => void;
  onLoginSuccess: (userInfo: UserInfo) => void;
  navigateTo: (screen: string, params?: any) => void;
}

const LoginScreen = ({ onBack, onLoginSuccess, navigateTo }: LoginScreenProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSocialLogin = (provider: string) => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess({
        name: `${provider} User`,
        email: `user@${provider}.com`,
      });
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full bg-white animate-fade-in relative pb-safe">
      <StatusBar theme="dark" />

      {isLoading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mb-4" />
          <p className="text-sm font-bold text-gray-600">
            안전하게 로그인 중입니다...
          </p>
        </div>
      )}

      <div className="px-6 pt-12 pb-6">
        <button
          onClick={onBack}
          className="mb-6 p-2 -ml-2 rounded-full hover:bg-gray-100 w-fit"
        >
          <ChevronLeft />
        </button>
        <h1 className="text-3xl font-black mb-2">
          반가워요! 👋
          <br />
          SNS로 간편하게 시작하세요
        </h1>
        <p className="text-gray-500 font-medium">
          복잡한 비밀번호 없이 3초만에 로그인하세요.
        </p>
      </div>

      <div className="flex-1 px-6 flex flex-col gap-3 justify-center pb-10">
        <button
          onClick={() => handleSocialLogin("Kakao")}
          className="w-full relative flex items-center justify-center bg-[#FEE500] text-[#000000] rounded-2xl py-4 text-sm font-bold transition-transform active:scale-[0.98]"
        >
          <div className="absolute left-5 w-6 h-6 flex items-center justify-center">
            <svg
              viewBox="0 0 32 32"
              fill="currentColor"
              className="w-full h-full"
            >
              <path d="M16 4.64c-6.96 0-12.64 4.48-12.64 10.08 0 3.52 2.32 6.64 5.76 8.48l-1.44 5.44c-.16.56.48 1.04.96.72l6.32-4.24c.32 0 .72.08 1.04.08 6.96 0 12.64-4.48 12.64-10.08S22.96 4.64 16 4.64z" />
            </svg>
          </div>
          카카오로 로그인
        </button>

        <button
          onClick={() => handleSocialLogin("Naver")}
          className="w-full relative flex items-center justify-center bg-[#03C75A] text-white rounded-2xl py-4 text-sm font-bold transition-transform active:scale-[0.98]"
        >
          <div className="absolute left-5 w-6 h-6 flex items-center justify-center text-xl font-black leading-none pb-0.5">
            N
          </div>
          네이버로 로그인
        </button>

        <button
          onClick={() => handleSocialLogin("Google")}
          className="w-full relative flex items-center justify-center bg-white border border-gray-200 text-gray-800 rounded-2xl py-4 text-sm font-bold transition-transform active:scale-[0.98] shadow-sm hover:bg-gray-50"
        >
          <div className="absolute left-5 w-6 h-6 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          </div>
          Google로 로그인
        </button>

        <div className="mt-6 flex justify-center">
          <button
            onClick={() => navigateTo("signup")}
            className="text-xs font-bold text-gray-400 hover:text-gray-600 underline underline-offset-4"
          >
            혹시 이메일로 가입하고 싶으신가요?
          </button>
        </div>
      </div>

      <div className="p-6 text-center">
        <p className="text-xs text-gray-400">
          계속 진행하면{" "}
          <span className="underline cursor-pointer">이용약관</span> 및{" "}
          <span className="underline cursor-pointer">개인정보처리방침</span>에
          동의하는 것으로 간주됩니다.
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
