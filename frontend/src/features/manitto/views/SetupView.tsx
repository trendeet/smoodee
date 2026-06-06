"use client";

import React, { useState } from "react";
import { Users, UserPlus, Play, User, Check } from "lucide-react";
import { ManittoParticipantInfo } from "../types";
import { manittoService } from "../lib/manittoService";
import DateTimePicker from "../components/DateTimePicker";

interface SetupViewProps {
  roomCode: string;
  participants: ManittoParticipantInfo[];
  endDate: string;
  isHost: boolean;
  myUserId: number;
  onChangeEndDate: (date: string) => void;
  onInvite: () => void;
  onStart: () => void;
  onNicknameSaved?: (nickname: string) => void;
}

const SetupView = ({
  roomCode,
  participants,
  endDate,
  isHost,
  myUserId,
  onChangeEndDate,
  onInvite,
  onStart,
  onNicknameSaved,
}: SetupViewProps) => {
  const [copied, setCopied] = useState(false);
  const myParticipant = participants.find((p) => p.userId === myUserId);
  const [nickname, setNickname] = useState(myParticipant?.nickname ?? "");
  const [nicknameSaved, setNicknameSaved] = useState(!!myParticipant?.nickname);

  const handleSaveNickname = async () => {
    if (!nickname.trim()) return;
    await manittoService.setNickname(roomCode, nickname.trim());
    setNicknameSaved(true);
    onNicknameSaved?.(nickname.trim());
  };

  const handleInvite = () => {
    navigator.clipboard.writeText(roomCode).catch(() => {
      const el = document.createElement("textarea");
      el.value = roomCode;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onInvite();
  };

  return (
    <div className="p-6 h-full flex flex-col items-center animate-in fade-in duration-500">
      <div className="w-full bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(233,150,122,0.3)] mb-6 text-center mt-4 text-black relative">
        <h2 className="text-xl font-black mb-2 uppercase text-[#E9967A]">매칭 대기실</h2>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          친구들이 입장할 때까지 기다려주세요!
        </p>
        {copied && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white px-3 py-1.5 border-2 border-white text-[10px] font-black animate-bounce shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] whitespace-nowrap z-50">
            초대 코드 복사 완료! 📋
          </div>
        )}
      </div>

      {isHost && (
        <div className="w-full bg-[#FAF9F6] border-4 border-black p-4 mb-4 text-black">
          <p className="text-[10px] font-black text-slate-400 mb-2 uppercase">종료 기간 설정</p>
          <DateTimePicker value={endDate} onChange={onChangeEndDate} />
        </div>
      )}

      {/* 별칭 입력 */}
      <div className="w-full bg-white border-4 border-black p-4 mb-8 text-black shadow-[4px_4px_0px_0px_rgba(233,150,122,0.4)]">
        <p className="text-[10px] font-black text-slate-400 mb-1 uppercase">내 별칭</p>
        <p className="text-[9px] text-slate-500 mb-3 leading-relaxed">
          서로를 알아볼 수 있는 이름, 별칭을 넣어주세요.<br />
          마니또를 구별할 때 사용됩니다.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={nickname}
            onChange={(e) => { setNickname(e.target.value); setNicknameSaved(false); }}
            onKeyDown={(e) => e.key === "Enter" && handleSaveNickname()}
            placeholder="예: 안경 쓴 사람, 키 큰 민준"
            maxLength={20}
            className="flex-1 font-black text-xs p-2 border-2 border-black focus:outline-none bg-[#FAF9F6]"
          />
          <button
            onClick={handleSaveNickname}
            disabled={!nickname.trim() || nicknameSaved}
            className={`px-3 border-2 border-black text-[10px] font-black transition-all ${
              nicknameSaved
                ? "bg-green-400 text-white"
                : "bg-[#E9967A] text-white active:translate-x-0.5 active:translate-y-0.5"
            } disabled:opacity-40`}
          >
            {nicknameSaved ? <Check size={14} /> : "저장"}
          </button>
        </div>
      </div>

      <div className="w-full mb-8 text-black">
        <div className="flex justify-between items-end mb-4">
          <h3 className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-2">
            <Users size={16} /> 참가자 ({participants.length})
          </h3>
          <button
            onClick={handleInvite}
            className="flex items-center gap-2 bg-[#FAF9F6] border-2 border-black px-3 py-1 text-[10px] font-black text-black"
          >
            <UserPlus size={14} /> 초대
          </button>
        </div>
        <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
          {participants.map((u, i) => (
            <div
              key={u.userId}
              className="bg-white border-4 border-black p-3 flex items-center gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] hover:bg-[#F5E6D3] transition-colors"
            >
              <div
                className="w-10 h-10 border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] shrink-0"
                style={{ backgroundColor: u.avatarColor }}
              >
                <User size={20} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm text-black leading-tight truncate">
                  {u.nickname || `참가자${i + 1}`}
                </p>
              </div>
              <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 border border-black shrink-0">
                <div className="w-2 h-2 bg-green-500 animate-pulse" />
                <span className="text-[8px] font-black uppercase text-black">READY</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isHost && (
        <div className="mt-auto w-full">
          {!nicknameSaved && !myParticipant?.nickname && (
            <p className="text-center text-[9px] font-black text-red-400 mb-2 uppercase">
              별칭을 먼저 저장해주세요
            </p>
          )}
          <button
            onClick={onStart}
            disabled={participants.length < 2 || (!nicknameSaved && !myParticipant?.nickname)}
            className={`w-full text-white border-4 border-black py-5 font-black uppercase tracking-tighter flex items-center justify-center gap-3 transition-all ${
              participants.length >= 2 && (nicknameSaved || !!myParticipant?.nickname)
                ? "bg-[#E9967A] shadow-[6px_6px_0px_0px_black] active:shadow-none active:translate-x-1 active:translate-y-1"
                : "bg-slate-300 cursor-not-allowed"
            }`}
          >
            <Play size={24} /> 매칭 시작하기
          </button>
        </div>
      )}
      {!isHost && (
        <div className="mt-auto w-full text-center text-[11px] font-black text-slate-400 uppercase">
          방장이 매칭을 시작할 때까지 대기 중...
        </div>
      )}
    </div>
  );
};

export default SetupView;
