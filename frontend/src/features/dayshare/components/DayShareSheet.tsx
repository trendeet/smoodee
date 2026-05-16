"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, MessageCircle, ChevronLeft } from "lucide-react";
import { groupService } from "@/lib/api/groupService";

interface DayShareSheetProps {
  onClose: () => void;
}

const DayShareSheet = ({ onClose }: DayShareSheetProps) => {
  const router = useRouter();
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [inviteCodeError, setInviteCodeError] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-[390px] bg-white rounded-3xl px-6 pt-6 pb-8 mx-4 animate-fade-in shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6" />
        {!showJoinInput ? (
          <>
            <h2 className="text-lg font-black text-gray-900 mb-1">하루 공유</h2>
            <p className="text-sm text-gray-400 mb-6">그룹을 만들거나 초대코드로 입장하세요.</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { onClose(); router.push("/day_share"); }}
                className="w-full py-4 bg-black text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <UserPlus size={16} /> 그룹 만들기
              </button>
              <button
                onClick={() => setShowJoinInput(true)}
                className="w-full py-4 font-bold rounded-2xl text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform text-gray-700"
                style={{ background: "#F8FAFC", border: "3px solid #333", boxShadow: "4px 4px 0 rgba(0,0,0,0.12)" }}
              >
                <MessageCircle size={16} /> 그룹 입장하기
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => setShowJoinInput(false)}
              className="mb-4 p-1 -ml-1 rounded-full hover:bg-gray-100 w-fit"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-black text-gray-900 mb-1">그룹 입장하기</h2>
            <p className="text-sm text-gray-400 mb-6">초대코드를 입력해주세요.</p>
            <input
              type="text"
              value={inviteCodeInput}
              onChange={(e) => { setInviteCodeInput(e.target.value.toUpperCase()); setInviteCodeError(false); }}
              placeholder="초대코드 입력"
              className={`w-full bg-gray-50 rounded-2xl px-4 py-4 font-bold text-center text-lg tracking-widest focus:outline-none focus:ring-2 transition-all mb-1 border ${inviteCodeError ? "border-red-400 focus:ring-red-200" : "border-gray-200 focus:ring-black/10"}`}
              maxLength={8}
              autoFocus
            />
            {inviteCodeError && (
              <p className="text-xs text-red-500 font-medium text-center mb-3">존재하지 않는 초대코드예요. 다시 확인해주세요.</p>
            )}
            <div className={inviteCodeError ? "mt-1" : "mt-4"}>
              <button
                onClick={async () => {
                  if (!inviteCodeInput.trim() || isJoining) return;
                  setIsJoining(true);
                  setInviteCodeError(false);
                  try {
                    await groupService.getGroupByInviteCode(inviteCodeInput.trim());
                    onClose();
                    router.push(`/group/${inviteCodeInput.trim()}`);
                  } catch {
                    setInviteCodeError(true);
                  } finally {
                    setIsJoining(false);
                  }
                }}
                disabled={!inviteCodeInput.trim() || isJoining}
                className="w-full py-4 bg-black text-white font-bold rounded-2xl text-sm active:scale-[0.98] transition-transform disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {isJoining ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "입장하기"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DayShareSheet;
