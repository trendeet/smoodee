"use client";

import React, { useState } from "react";
import { Bell, Award, ChevronUp, ChevronDown, Home, CheckSquare, Square } from "lucide-react";
import CountdownTimer from "../components/CountdownTimer";
import { PixelGift } from "../components/PixelArts";
import { ManittoParticipantInfo } from "../types";
import { MISSIONS, MissionId } from "../constants/gameConfig";

interface LobbyViewProps {
  endDate: string;
  myTargetName: string;
  myTargetUserId: number;
  participants: ManittoParticipantInfo[];
  myUserId: number;
  notifications: { id: number; text: string; time: string }[];
  completedMissions: Set<MissionId>;
  onJoinRoom: (userId: number) => void;
  onShowResult: () => void;
}

const LobbyView = ({
  endDate,
  myTargetName,
  myTargetUserId,
  participants,
  myUserId,
  notifications,
  completedMissions,
  onJoinRoom,
  onShowResult,
}: LobbyViewProps) => {
  const [isMissionsExpanded, setIsMissionsExpanded] = useState(false);
  const completedCount = MISSIONS.filter((m) => completedMissions.has(m.id)).length;
  const allDone = completedCount === MISSIONS.length;

  return (
    <div className="p-4 pb-48 space-y-6 text-black">
      <div className="flex justify-between items-center">
        <CountdownTimer targetDate={endDate} />
        <button
          onClick={onShowResult}
          className="bg-[#162B44] text-white text-[10px] font-black px-3 py-2 border-2 border-black shadow-[3px_3px_0px_0px_black] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all uppercase tracking-tight"
        >
          결과보기 ➔
        </button>
      </div>

      <div className="bg-[#FAF9F6] border-4 border-black p-5 text-[#162B44] shadow-[4px_4px_0px_0px_black] relative overflow-hidden">
        <h2 className="text-[10px] font-black opacity-90 mb-1 underline decoration-2 uppercase text-[#E9967A]">
          마니또 미션
        </h2>
        <p className="text-2xl font-black leading-tight italic text-black">
          {myTargetName} 님의 마니또가 되었어요!
          <br />
          마음을 전달해 보세요 ✨
        </p>
        <button
          onClick={() => onJoinRoom(myTargetUserId)}
          className="mt-4 bg-[#E9967A] text-white border-2 border-black px-4 py-2 text-[10px] font-black shadow-[3px_3px_0px_0px_black] active:shadow-none transition-all uppercase tracking-tighter"
        >
          {myTargetName}의 방 가기 &rarr;
        </button>
        <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12">
          <PixelGift size={100} />
        </div>
      </div>

      <section
        className={`border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] transition-colors ${
          allDone ? "bg-green-50" : "bg-white"
        }`}
      >
        <div className="flex justify-between items-center mb-4 border-b-2 border-slate-100 pb-2">
          <h3 className="text-[11px] font-black text-slate-800 tracking-widest flex items-center gap-2 uppercase">
            <Award size={16} className={allDone ? "text-green-500" : "text-[#E9967A]"} />
            오늘의 미션
            <span className={`text-[10px] font-black px-1.5 py-0.5 border ${
              allDone
                ? "bg-green-100 text-green-700 border-green-400"
                : "bg-slate-100 text-slate-500 border-slate-300"
            }`}>
              {completedCount}/{MISSIONS.length}
            </span>
          </h3>
          <button
            onClick={() => setIsMissionsExpanded(!isMissionsExpanded)}
            className="p-1 border-2 border-black bg-[#FAF9F6] hover:bg-[#F5E6D3] shadow-[2px_2px_0px_0px_black] transition-all"
          >
            {isMissionsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
        <div className="space-y-3">
          {(isMissionsExpanded ? MISSIONS : MISSIONS.slice(0, 1)).map((m) => {
            const done = completedMissions.has(m.id);
            return (
              <div key={m.id} className="flex items-start gap-3">
                {done
                  ? <CheckSquare size={20} className="text-green-500 mt-0.5 flex-shrink-0" />
                  : <Square size={20} className="text-slate-200 mt-0.5 flex-shrink-0" />
                }
                <div>
                  <p className={`text-[12px] font-black ${done ? "text-slate-300 line-through" : "text-slate-700"}`}>
                    {m.title}
                  </p>
                  {!done && (
                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">{m.desc}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {allDone && (
          <p className="text-[10px] font-black text-green-600 text-center mt-3 pt-3 border-t-2 border-green-100">
            🎉 오늘의 미션을 모두 완료했어요!
          </p>
        )}
      </section>

      <section>
        <h3 className="text-[11px] font-black text-slate-400 mb-3 tracking-widest flex items-center gap-2 uppercase">
          <div className="w-2 h-2 bg-black" /> 활성화된 방
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {participants.map((p) => (
            <button
              key={p.userId}
              onClick={() => onJoinRoom(p.userId)}
              className="bg-white p-3 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none transition-all text-center flex flex-col items-center gap-2 relative group"
            >
              <div
                className={`w-14 h-14 border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] transition-transform group-hover:scale-105`}
                style={{ backgroundColor: p.avatarColor }}
              >
                <Home size={28} className="text-white" />
              </div>
              <span className="text-[11px] font-black text-slate-800">
                {p.nickname ?? p.name}
                {p.userId === myUserId && " (나)"}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="pb-8">
        <h3 className="text-[11px] font-black text-slate-400 mb-3 tracking-widest flex items-center gap-2 uppercase">
          <Bell size={14} /> 새로운 소식
        </h3>
        <div className="space-y-2">
          {notifications.length === 0 && (
            <p className="text-[11px] text-slate-300 font-bold text-center py-4">아직 새로운 소식이 없어요</p>
          )}
          {notifications.map((n) => (
            <div
              key={n.id}
              className="bg-white border-2 border-black p-3 flex justify-between items-center shadow-[3px_3px_0px_0px_black]"
            >
              <p className="text-[11px] font-bold text-slate-700">{n.text}</p>
              <span className="text-[9px] font-black text-slate-300 uppercase">{n.time}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default LobbyView;
