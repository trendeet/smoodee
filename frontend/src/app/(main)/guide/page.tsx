"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, HelpCircle, Grid, User, Users, BookMarked } from "lucide-react";
import StatusBar from "@/components/ui/StatusBar";
import Button from "@/components/ui/Button";

const GUIDE_SKIP_KEY = "smoodee_guide_skip_date";

const GuideScreen = () => {
  const router = useRouter();
  const [skipToday, setSkipToday] = useState(false);

  useEffect(() => {
    sessionStorage.setItem("smoodee_guide_seen", "true");
  }, []);

  const handleStart = () => {
    if (skipToday) {
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem(GUIDE_SKIP_KEY, today);
    }
    router.replace("/");
  };

  return (
    <div className="flex flex-col h-full bg-white relative animate-fade-in pb-safe">
      <StatusBar theme="dark" />

      <div className="px-4 py-3 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10 border-b border-gray-100">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold tracking-tight text-gray-900">
          사용 가이드
        </h1>
        <div className="w-8" />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-10 space-y-16">
        <div className="text-center">
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <HelpCircle className="text-white" size={32} />
          </div>
          <h2 className="text-2xl font-black mb-3">플랫폼 사용 가이드</h2>
          <p className="text-gray-500 text-sm font-medium leading-relaxed">
            다양한 템플릿으로 일상을
            <br />
            특별하게 기록하는 방법을 알아볼까요?
          </p>
        </div>

        <div className="space-y-12">
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-5 border border-gray-100 shadow-inner relative">
              <Grid size={32} className="text-blue-500" />
              <div className="absolute -top-1 -left-1 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-black text-sm border-4 border-white shadow-sm">
                1
              </div>
            </div>
            <h3 className="text-xl font-black mb-2 text-gray-900">
              템플릿을 선택합니다
            </h3>
            <p className="text-gray-500 text-sm break-keep leading-relaxed font-medium px-4">
              홈 화면에서 지금 내 상황에 맞는
              <br />
              마음에 드는 템플릿을 선택해보세요.
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-5 border border-gray-100 shadow-inner relative">
              <BookMarked size={32} className="text-green-500" />
              <div className="absolute -top-1 -left-1 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-black text-sm border-4 border-white shadow-sm">
                2
              </div>
            </div>
            <h3 className="text-xl font-black mb-2 text-gray-900">
              추억을 저장해보세요
            </h3>
            <p className="text-gray-500 text-sm break-keep leading-relaxed font-medium px-2">
              <span className="font-black text-gray-700">로그인</span>을 하면{" "}
              <span className="font-black text-gray-700">보관함</span>,{" "}
              <span className="font-black text-gray-700">진행중인 활동</span>과 같이
              <br />
              추억을 <span className="font-black text-gray-700">저장</span>할 수 있습니다.
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-5 border border-gray-100 shadow-inner relative">
              <User size={32} className="text-purple-500" />
              <div className="absolute -top-1 -left-1 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-black text-sm border-4 border-white shadow-sm">
                3
              </div>
              <div className="absolute -bottom-2 bg-gray-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-md">
                개인
              </div>
            </div>
            <h3 className="text-xl font-black mb-2 text-gray-900">
              혼자서도 즐길 수 있어요
            </h3>
            <p className="text-gray-500 text-sm break-keep leading-relaxed font-medium px-4">
              &apos;개인&apos; 태그를 갖고 있는 템플릿은
              <br />
              혼자서도 즐길 수 있습니다!
            </p>
          </div>

          <div className="flex flex-col items-center text-center pb-8">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-5 border border-gray-100 shadow-inner relative">
              <Users size={32} className="text-orange-500" />
              <div className="absolute -top-1 -left-1 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-black text-sm border-4 border-white shadow-sm">
                4
              </div>
              <div className="absolute -bottom-2 bg-gray-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-md">
                그룹
              </div>
            </div>
            <h3 className="text-xl font-black mb-2 text-gray-900">
              친구들을 초대해보세요
            </h3>
            <p className="text-gray-500 text-sm break-keep leading-relaxed font-medium px-2">
              &apos;그룹&apos; 태그를 갖고 있는 템플릿은
              <br />
              친구들과 함께 사용할 수 있습니다.
              <br />
              초대 기능을 통해 즐거움을 나눠보세요!
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 bg-white border-t border-gray-100 safe-area-bottom sticky bottom-0 z-10 space-y-3">
        <Button size="lg" onClick={handleStart} className="w-full shadow-lg">
          플랫폼 시작하기
        </Button>
        <label className="flex items-center gap-2.5 cursor-pointer justify-center">
          <input
            type="checkbox"
            checked={skipToday}
            onChange={(e) => setSkipToday(e.target.checked)}
            className="w-4 h-4 rounded accent-black cursor-pointer"
          />
          <span className="text-sm font-medium text-gray-500">오늘 하루 보지 않기</span>
        </label>
      </div>
    </div>
  );
};

export default GuideScreen;
