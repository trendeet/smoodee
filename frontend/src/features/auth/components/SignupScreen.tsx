import React, { useState } from "react";
import { ChevronLeft, User, Mail, Key } from "lucide-react";
import StatusBar from "@/components/ui/StatusBar";
import Button from "@/components/ui/Button";

interface UserInfo {
  name: string;
  email: string;
}

interface SignupScreenProps {
  onBack: () => void;
  onSignupSuccess: (userInfo: UserInfo) => void;
}

const SignupScreen = ({ onBack, onSignupSuccess }: SignupScreenProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = () => {
    if (!name || !email || !password) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onSignupSuccess({ name: name, email: email });
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full bg-white animate-slide-left relative pb-safe">
      <StatusBar theme="dark" />
      <div className="px-6 pt-12 pb-6">
        <button
          onClick={onBack}
          className="mb-6 p-2 -ml-2 rounded-full hover:bg-gray-100 w-fit"
        >
          <ChevronLeft />
        </button>
        <h1 className="text-3xl font-black mb-2">
          환영합니다! 🎉
          <br />
          시작해볼까요?
        </h1>
        <p className="text-gray-500">간단한 정보만 입력하면 됩니다.</p>
      </div>

      <div className="flex-1 px-6 flex flex-col gap-4 overflow-y-auto no-scrollbar">
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-500 ml-1">이름</label>
          <div className="relative">
            <User
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
              placeholder="홍길동"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-500 ml-1">이메일</label>
          <div className="relative">
            <Mail
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
              placeholder="user@example.com"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-500 ml-1">
            비밀번호
          </label>
          <div className="relative">
            <Key
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
              placeholder="8자 이상 입력해주세요"
            />
          </div>
        </div>
      </div>

      <div className="p-6">
        <Button
          size="lg"
          onClick={handleSignup}
          loading={isLoading}
          disabled={!name || !email || !password}
        >
          가입하고 시작하기
        </Button>
      </div>
    </div>
  );
};

export default SignupScreen;
