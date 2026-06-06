"use client";

import React, { useState } from "react";
import { X, Target, CheckCircle2, User, PencilLine } from "lucide-react";
import { ManittoParticipantInfo } from "../types";

interface DeductionModalProps {
  suspects: ManittoParticipantInfo[];
  isSolved: boolean;
  onClose: () => void;
  onSubmit: (guessedUserId: number, reason: string) => void;
}

const DeductionModal = ({ suspects, isSolved, onClose, onSubmit }: DeductionModalProps) => {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState("");

  const selectedSuspect = suspects.find((s) => s.userId === selectedId);

  const handleSubmit = () => {
    if (selectedId && reason) {
      onSubmit(selectedId, reason);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-white border-4 border-black w-full max-w-sm shadow-[12px_12px_0px_0px_black] overflow-hidden flex flex-col">
        <div className="p-4 bg-[#162B44] text-white border-b-4 border-black flex justify-between items-center">
          <h3 className="text-xs font-black uppercase flex items-center gap-2">
            <Target size={16} /> 누가 내 마니또일까?
          </h3>
          <button
            onClick={onClose}
            className="p-1 border-2 border-white hover:bg-white hover:text-[#162B44] transition-all"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 flex-1 flex flex-col bg-[#FAF9F6]">
          {isSolved ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 border-4 border-black mx-auto flex items-center justify-center mb-6 shadow-[4px_4px_0px_0px_black]">
                <CheckCircle2 size={48} className="text-green-600" />
              </div>
              <h4 className="text-xl font-black mb-2 text-black">제출 완료!</h4>
              <p className="text-sm font-bold text-slate-600 leading-relaxed">
                추리 내용이 정상적으로 저장되었습니다.
              </p>
              <p className="mt-4 p-3 bg-white border-2 border-black border-dashed text-[10px] font-black text-[#E9967A]">
                추리한 내용은 마니또 결과날에 함께 공유됩니다.
              </p>
              <button
                onClick={onClose}
                className="mt-8 w-full py-4 bg-black text-white font-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]"
              >
                닫기
              </button>
            </div>
          ) : step === 1 ? (
            <>
              <p className="text-[11px] font-black text-slate-400 mb-6 uppercase text-center">
                의심되는 친구를 한 명 지목해 보세요!
              </p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {suspects.map((s) => (
                  <button
                    key={s.userId}
                    onClick={() => setSelectedId(s.userId)}
                    className={`flex flex-col items-center p-3 border-4 transition-all ${
                      selectedId === s.userId
                        ? "border-black bg-[#F5E6D3]"
                        : "border-transparent bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className="w-12 h-12 border-2 border-black mb-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] flex items-center justify-center"
                      style={{ backgroundColor: s.avatarColor }}
                    >
                      <User size={24} className="text-white" />
                    </div>
                    <span className="text-xs font-black text-black">{s.nickname ?? s.name}</span>
                  </button>
                ))}
              </div>
              <button
                disabled={!selectedId}
                onClick={() => selectedId && setStep(2)}
                className={`w-full py-4 border-4 border-black font-black text-sm shadow-[6px_6px_0px_0px_black] ${
                  selectedId
                    ? "bg-[#E9967A] text-white"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                }`}
              >
                지목하기
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6 p-3 bg-white border-4 border-black">
                <div
                  className="w-10 h-10 border-2 border-black flex items-center justify-center"
                  style={{ backgroundColor: selectedSuspect?.avatarColor }}
                >
                  <User size={18} className="text-white" />
                </div>
                <p className="text-xs font-black text-black">
                  {(selectedSuspect?.nickname ?? selectedSuspect?.name)} 님을 지목하시겠어요?
                </p>
              </div>
              <p className="text-[10px] font-black text-slate-400 mb-2 uppercase flex items-center gap-2">
                <PencilLine size={12} /> 그렇게 생각한 이유
              </p>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="예: 오늘 사물함에 우유 두고 가신 분 맞죠?!"
                className="w-full h-32 bg-white border-4 border-black p-3 text-xs font-bold focus:outline-none mb-6 resize-none text-black"
              />
              <button
                disabled={!reason}
                onClick={handleSubmit}
                className={`w-full py-4 border-4 border-black font-black text-sm shadow-[6px_6px_0px_0px_black] ${
                  reason
                    ? "bg-[#E9967A] text-white"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                최종 제출하기
              </button>
              <p className="mt-4 text-[9px] font-black text-slate-400 text-center uppercase italic">
                추리한 내용은 마니또 결과날에 함께 공유됩니다.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeductionModal;
