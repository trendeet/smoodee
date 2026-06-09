"use client";

import React, { useState } from "react";
import { Sparkles, User, MessageCircle } from "lucide-react";
import { ManittoResultResponse } from "../types";

interface ResultViewProps {
  result: ManittoResultResponse;
  onRestart: () => void;
  onViewAllResults?: () => void;
}

const ResultView = ({
  result,
  onRestart,
  onViewAllResults,
}: ResultViewProps) => {
  const {
    realManittoName,
    realManittoAvatarColor,
    guessedUserId,
    guessedUserName,
    isCorrect,
    myGuessReason,
    othersGuesses,
  } = result;

  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <div className="p-5 space-y-6 overflow-y-auto h-full pb-24 text-black">
      <div className="w-full bg-[#162B44] text-white border-4 border-black p-5 shadow-[6px_6px_0px_0px_black] text-center">
        <h2 className="text-lg font-black uppercase italic tracking-tighter text-[#E9967A] flex items-center justify-center gap-2">
          <Sparkles size={20} /> 마니또 결과 발표일 <Sparkles size={20} />
        </h2>
        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-1">
          비밀 수호천사들의 활약이 모두 공개되었습니다!
        </p>
      </div>

      <div className="bg-white border-4 border-black p-5 shadow-[4px_4px_0px_0px_black] text-center">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-3">
          나를 몰래 지켜주던 천사
        </span>
        {/* 플립 카드 */}
        <div
          style={{ perspective: "600px" }}
          className="cursor-pointer select-none"
          onClick={() => setIsRevealed(true)}
        >
          <div
            style={{
              transformStyle: "preserve-3d",
              transform: isRevealed ? "rotateY(0deg)" : "rotateY(180deg)",
              transition: "transform 0.6s ease",
              position: "relative",
              height: "148px",
            }}
          >
            {/* 앞면: 공개 */}
            <div
              style={{ backfaceVisibility: "hidden" }}
              className="absolute inset-0 flex flex-col items-center justify-center"
            >
              <div
                className="w-16 h-16 mx-auto border-4 border-black flex items-center justify-center mb-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)]"
                style={{ backgroundColor: realManittoAvatarColor }}
              >
                <User size={32} className="text-white" />
              </div>
              <p className="text-lg font-black text-black leading-snug">
                내 마니또는{" "}
                <span className="text-[#E9967A] underline decoration-4 underline-offset-4 font-black">
                  &apos;{realManittoName}&apos;
                </span>{" "}
                님! 🎉
              </p>
            </div>
            {/* 뒷면: 비공개 */}
            <div
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-[#162B44] border-4 border-black"
            >
              <div className="w-16 h-16 border-4 border-[#E9967A] flex items-center justify-center mb-3 bg-[#1e3a5f]">
                <span className="text-4xl font-black text-white">?</span>
              </div>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest animate-pulse">
                탭해서 공개
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#FAF9F6] border-4 border-black p-5 shadow-[4px_4px_0px_0px_black]">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-3">
          나의 마니또 추리 결과
        </span>

        {!guessedUserId ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-white p-2.5 border-2 border-black">
              <div className="bg-slate-200 text-slate-700 text-[10px] font-black px-2 py-1 border border-slate-400 uppercase tracking-wider">
                미참여 🤫
              </div>
              <p className="text-xs font-black text-slate-700">
                이번 게임에는 추리에 참여하지 않았습니다.
              </p>
            </div>
            <div className="bg-white p-3.5 border-2 border-dashed border-slate-300 rounded-sm">
              <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                사물함 속 마니또의 선물 상자나 바닥에 흩뿌려진 진한 2인조 발자국
                단서를 좀 더 꼼꼼히 관찰했다면 누구인지 알아차릴 수 있었을지도
                몰라요! 다음 게임에서는 꼭 우측 하단 돋보기 버튼을 통해 추리에
                도전해 보세요!
              </p>
            </div>
          </div>
        ) : isCorrect ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-green-50 p-2.5 border-2 border-black">
              <div className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-1 border border-green-600 uppercase tracking-wider">
                추리 성공! 🎯
              </div>
              <p className="text-xs font-black text-slate-700">
                정답! &apos;{guessedUserName}&apos; 님이 진짜 마니또가 맞습니다.
              </p>
            </div>
            <div className="space-y-1.5 bg-white p-3 border-2 border-black">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide">
                내가 지목할 때 작성했던 추리 이유
              </p>
              <p className="text-xs italic font-medium text-slate-600">
                &ldquo;{myGuessReason}&rdquo;
              </p>
            </div>
            <p className="text-[11px] font-bold text-green-700 leading-relaxed bg-green-100/30 p-2.5 border-2 border-dashed border-green-200">
              훌륭합니다! 치밀하게 다녀간 마니또의 동선과 흔적을 예리한 눈빛으로
              완벽히 꿰뚫어 보셨군요.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-red-50 p-2.5 border-2 border-black">
              <div className="shrink-0 bg-red-100 text-red-600 text-[10px] font-black px-2 py-1 border border-red-500 uppercase tracking-wider">
                추리 실패
              </div>
              <p className="text-xs font-black text-slate-700 min-w-0">
                아쉽게도 오답! 진짜는 &apos;{realManittoName}&apos; 님이었습니다.
              </p>
            </div>
            <div className="space-y-1.5 bg-white p-2.5 border-2 border-black">
              <p className="text-xs font-bold text-slate-500">
                내가 오해했던 대상:{" "}
                <span className="font-black text-black">
                  &apos;{guessedUserName}&apos;
                </span>
              </p>
              <div className="bg-slate-50 p-2.5 border-2 border-dashed border-slate-200 text-xs italic font-medium text-slate-600">
                &ldquo;{myGuessReason}&rdquo;
              </div>
            </div>
            <p className="text-[11px] font-bold text-red-600 leading-relaxed bg-red-100/20 p-2.5 border-2 border-dashed border-red-100">
              진짜 마니또가 흔적을 감쪽같이 위장했나 봐요! 다음 판에는 더 철저히
              단서를 모아보세요.
            </p>
          </div>
        )}
      </div>

      <div className="bg-[#FAF9F6] border-4 border-black p-5 shadow-[4px_4px_0px_0px_black]">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-3">
          나를 오해했던 사람들
        </span>
        {othersGuesses.length === 0 ? (
          <p className="text-[11px] text-slate-400 font-bold text-center py-2">
            아무도 나를 지목하지 않았어요
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {othersGuesses.map((item, i) => (
              <span
                key={i}
                className="bg-white border-2 border-black text-[11px] font-black px-3 py-1 shadow-[2px_2px_0px_0px_black]"
              >
                {item.guesserName}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <MessageCircle size={14} /> 친구들이 남긴 나의 흔적 추리
        </h3>
        {othersGuesses.length === 0 && (
          <p className="text-[11px] text-slate-300 font-bold text-center py-4">
            아직 추리 피드백이 없어요
          </p>
        )}
        <div className="space-y-3">
          {othersGuesses.map((item, i) => (
            <div
              key={i}
              className="bg-white border-4 border-black p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] relative"
            >
              <span className="absolute -top-3 left-3 bg-black text-white text-[8px] font-black px-2 py-0.5 border border-white">
                GUESS BY {item.guesserName}
              </span>
              <p className="text-xs font-bold text-slate-700 leading-relaxed mt-1">
                &ldquo;{item.reason}&rdquo;
              </p>
            </div>
          ))}
        </div>
      </div>

      {onViewAllResults && (
        <button
          onClick={onViewAllResults}
          className="w-full bg-[#E9967A] text-white border-4 border-black py-4 shadow-[4px_4px_0px_0px_black] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all font-black text-xs uppercase tracking-tighter flex items-center justify-center gap-2"
        >
          <Sparkles size={14} /> 전체 결과 보러 가기 &rarr;
        </button>
      )}
    </div>
  );
};

export default ResultView;
