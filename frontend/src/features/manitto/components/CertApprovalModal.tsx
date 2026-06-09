"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

interface CertApprovalModalProps {
  imageUrl: string;
  onApprove: (comment: string) => void;
  onReject: () => void;
  onClose: () => void;
}

const CertApprovalModal = ({ imageUrl, onApprove, onReject, onClose }: CertApprovalModalProps) => {
  const [comment, setComment] = useState("");

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm text-black">
      <div className="bg-white border-4 border-black w-full max-w-xs shadow-[8px_8px_0px_0px_black]">
        <div className="flex justify-between items-center px-4 pt-4 pb-2 border-b-2 border-black">
          <p className="text-[11px] font-black text-[#E9967A] uppercase tracking-tight">
            🎁 마니또 인증 요청
          </p>
          <button onClick={onClose} className="p-1 border-2 border-black bg-white">
            <X size={16} />
          </button>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="인증 이미지"
          className="w-full aspect-square object-cover border-b-2 border-black"
        />

        <div className="p-4 space-y-3">
          <p className="text-[11px] font-black text-slate-600 text-center">
            마니또가 인증샷을 남겼어요!
            <br />
            게시판에 올릴까요?
          </p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="한마디 코멘트를 남겨주세요 (선택)"
            className="w-full h-16 bg-[#FAF9F6] border-2 border-slate-100 p-2 text-[11px] font-bold focus:outline-none focus:border-black resize-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onReject}
              className="py-3 border-4 border-black bg-white text-[11px] font-black shadow-[3px_3px_0px_0px_black] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
            >
              거절
            </button>
            <button
              onClick={() => onApprove(comment)}
              className="py-3 border-4 border-black bg-[#E9967A] text-white text-[11px] font-black shadow-[3px_3px_0px_0px_black] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
            >
              승인하기 ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertApprovalModal;
