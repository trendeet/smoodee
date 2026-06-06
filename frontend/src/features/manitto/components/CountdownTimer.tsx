"use client";

import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  targetDate: string;
}

const CountdownTimer = ({ targetDate }: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    const tick = () => {
      const diff = +new Date(targetDate) - Date.now();
      if (diff > 0) {
        setTimeLeft({
          d: Math.floor(diff / 86400000),
          h: Math.floor((diff / 3600000) % 24),
          m: Math.floor((diff / 60000) % 60),
          s: Math.floor((diff / 1000) % 60),
        });
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  const isUrgent = timeLeft.d === 0;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 border-4 border-black bg-white shadow-[3px_3px_0px_0px_black] ${
        isUrgent ? "animate-pulse" : ""
      }`}
    >
      <Clock size={14} className={isUrgent ? "text-red-500" : "text-black"} />
      <span className={`text-[10px] font-black italic ${isUrgent ? "text-red-500" : "text-black"}`}>
        {timeLeft.d > 0 && `${timeLeft.d}일 `}
        {timeLeft.h}시간 {String(timeLeft.m).padStart(2, "0")}분 {String(timeLeft.s).padStart(2, "0")}초
      </span>
    </div>
  );
};

export default CountdownTimer;
