"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Ghost, User, Gift, Footprints, Sparkles } from "lucide-react";
import { manittoService } from "@/features/manitto/lib/manittoService";
import { ManittoPairResult } from "@/features/manitto/types";

function AllResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code") ?? "";

  const [pairs, setPairs] = useState<ManittoPairResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setError("방 코드가 없습니다.");
      setIsLoading(false);
      return;
    }
    manittoService
      .getResult(code)
      .then((data) => setPairs(data.allPairs ?? []))
      .catch(() => setError("결과를 불러오지 못했어요."))
      .finally(() => setIsLoading(false));
  }, [code]);

  return (
    <div className="min-h-full flex flex-col bg-[#FAF9F6] font-mono text-black">
      {/* Header */}
      <header className="p-4 bg-white border-b-4 border-black flex items-center gap-3 sticky top-0 z-50">
        <button
          onClick={() => router.back()}
          className="p-1 border-2 border-black bg-white shadow-[2px_2px_0px_0px_black] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="w-9 h-9 bg-[#E9967A] border-2 border-black flex items-center justify-center text-white shadow-[2px_2px_0px_0px_black]">
          <Ghost size={20} />
        </div>
        <h1 className="font-black text-[13px] uppercase tracking-tighter">
          전체 마니또 결과
        </h1>
      </header>

      <main className="flex-1 p-5 space-y-4">
        {/* 타이틀 배너 */}
        <div className="w-full bg-[#162B44] text-white border-4 border-black p-5 shadow-[6px_6px_0px_0px_black] text-center">
          <h2 className="text-lg font-black uppercase italic tracking-tighter text-[#E9967A] flex items-center justify-center gap-2">
            <Sparkles size={20} /> 이번 게임의 모든 쌍 <Sparkles size={20} />
          </h2>
          <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-1">
            누가 누구의 마니또였는지 공개됩니다!
          </p>
        </div>

        {/* 범례 */}
        <div className="flex items-center gap-4 px-1">
          <span className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase">
            <Gift size={10} /> 아이템 수
          </span>
          <span className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase">
            <Footprints size={10} /> 방문 횟수
          </span>
        </div>

        {/* 로딩 */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-black border-t-[#E9967A] rounded-full animate-spin" />
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div className="bg-red-50 border-4 border-red-500 p-4 text-center">
            <p className="text-xs font-black text-red-600">{error}</p>
          </div>
        )}

        {/* 쌍 목록 */}
        {!isLoading && !error && pairs.length === 0 && (
          <p className="text-center text-[11px] font-black text-slate-300 py-12">
            결과 데이터가 없어요
          </p>
        )}

        {!isLoading && pairs.map((pair, i) => (
          <div
            key={i}
            className="bg-white border-4 border-black shadow-[4px_4px_0px_0px_black] overflow-hidden"
          >
            {/* 인덱스 태그 */}
            <div className="bg-[#162B44] px-3 py-1.5 flex items-center justify-between">
              <span className="text-white text-[9px] font-black uppercase tracking-widest">
                PAIR #{i + 1}
              </span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[9px] font-black text-slate-300">
                  <Gift size={9} /> {pair.itemCount}
                </span>
                <span className="flex items-center gap-1 text-[9px] font-black text-slate-300">
                  <Footprints size={9} /> {pair.visitCount}
                </span>
              </div>
            </div>

            {/* 페어 내용 */}
            <div className="p-4 flex items-center gap-3">
              {/* 마니또 */}
              <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                <div
                  className="w-12 h-12 border-3 border-black flex items-center justify-center shadow-[3px_3px_0px_0px_black]"
                  style={{ backgroundColor: pair.manittoAvatarColor, border: "3px solid black" }}
                >
                  <User size={18} className="text-white" />
                </div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                  마니또
                </span>
                <span className="text-[12px] font-black text-black truncate w-full text-center">
                  {pair.manittoName}
                </span>
              </div>

              {/* 화살표 */}
              <div className="flex flex-col items-center gap-1 px-1">
                <div className="flex items-center gap-0.5 text-[#E9967A]">
                  <div className="h-[3px] w-8 bg-[#E9967A]" />
                  <span className="text-sm font-black leading-none">▶</span>
                </div>
                <span className="text-[8px] font-black text-[#E9967A] uppercase">
                  care
                </span>
              </div>

              {/* 마니띠 */}
              <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                <div
                  className="w-12 h-12 flex items-center justify-center shadow-[3px_3px_0px_0px_black]"
                  style={{ backgroundColor: pair.manittiAvatarColor, border: "3px solid black" }}
                >
                  <User size={18} className="text-white" />
                </div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                  마니띠
                </span>
                <span className="text-[12px] font-black text-black truncate w-full text-center">
                  {pair.manittiName}
                </span>
              </div>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <AllResultsPage />
    </Suspense>
  );
}
