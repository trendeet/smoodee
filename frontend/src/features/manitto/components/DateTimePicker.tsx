"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";

interface DateTimePickerProps {
  value: string;
  onChange: (iso: string) => void;
}

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTE_STEPS = [0, 15, 30, 45];
const ITEM_H = 40;

function ScrollPicker({
  items,
  value,
  onChange,
}: {
  items: number[];
  value: number;
  onChange: (v: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isProgrammatic = useRef(false);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const idx = items.indexOf(value);
    if (idx < 0) return;
    isProgrammatic.current = true;
    el.scrollTop = idx * ITEM_H;
    const t = setTimeout(() => { isProgrammatic.current = false; }, 200);
    return () => clearTimeout(t);
  }, [value, items]);

  const onScroll = () => {
    if (isProgrammatic.current) return;
    const el = ref.current;
    if (!el) return;
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      const idx = Math.round(el.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(idx, items.length - 1));
      if (items[clamped] !== undefined) onChange(items[clamped]);
    }, 80);
  };

  return (
    <div
      className="relative border-2 border-black bg-white overflow-hidden"
      style={{ width: 72, height: ITEM_H * 3 }}
    >
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none z-10"
        style={{ height: ITEM_H, background: "linear-gradient(to bottom, rgba(255,255,255,0.95), transparent)" }}
      />
      <div
        className="absolute left-0 right-0 border-y-2 border-black pointer-events-none z-20"
        style={{ top: ITEM_H, height: ITEM_H }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none z-10"
        style={{ height: ITEM_H, background: "linear-gradient(to top, rgba(255,255,255,0.95), transparent)" }}
      />
      <div
        ref={ref}
        onScroll={onScroll}
        className="h-full overflow-y-scroll"
        style={{ scrollSnapType: "y mandatory", scrollbarWidth: "none" } as React.CSSProperties}
      >
        <div style={{ height: ITEM_H }} />
        {items.map((item) => (
          <div
            key={item}
            style={{ scrollSnapAlign: "center", height: ITEM_H }}
            className="flex items-center justify-center text-xl font-black select-none"
          >
            {String(item).padStart(2, "0")}
          </div>
        ))}
        <div style={{ height: ITEM_H }} />
      </div>
    </div>
  );
}

export default function DateTimePicker({ value, onChange }: DateTimePickerProps) {
  const selected = new Date(value);
  const [open, setOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  const selDay = selected.getDate();
  const selMonth = selected.getMonth();
  const selYear = selected.getFullYear();
  const selHour = selected.getHours();
  const selMin = selected.getMinutes();

  const snapMin = MINUTE_STEPS.reduce((p, c) =>
    Math.abs(c - selMin) < Math.abs(p - selMin) ? c : p
  );

  const isValuePast = new Date(selYear, selMonth, selDay, selHour, snapMin) <= new Date();

  const isDayBeforeToday = (day: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(viewYear, viewMonth, day) < today;
  };

  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = Array(firstDow).fill(null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  );
  while (cells.length % 7 !== 0) cells.push(null);

  const emit = (y: number, mo: number, d: number, h: number, mi: number) =>
    onChange(new Date(y, mo, d, h, mi, 0).toISOString());

  const pickDay = (day: number) => emit(viewYear, viewMonth, day, selHour, snapMin);
  const pickHour = (h: number) => emit(selYear, selMonth, selDay, h, snapMin);
  const pickMin = (mi: number) => emit(selYear, selMonth, selDay, selHour, mi);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const isSelected = (day: number) =>
    day === selDay && viewMonth === selMonth && viewYear === selYear;

  const isToday = (day: number) => {
    const now = new Date();
    return day === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear();
  };

  const formatDisplay = () =>
    `${selYear}년 ${selMonth + 1}월 ${selDay}일  ${String(selHour).padStart(2, "0")}:${String(snapMin).padStart(2, "0")}`;

  return (
    <>
      <div className="mb-4">
        {/* Trigger */}
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className={`w-full flex items-center justify-between px-3 py-2.5 border-2 border-black font-black text-[11px] transition-all ${
            open ? "bg-[#162B44] text-white shadow-none" : "bg-[#FAF9F6] text-black shadow-[2px_2px_0px_0px_black]"
          }`}
        >
          <span>📅 {formatDisplay()}</span>
          <span className="text-[9px] opacity-60">{open ? "▲" : "▼"}</span>
        </button>
      </div>

      {/* Calendar modal */}
      {open && (
        <div
          className="fixed inset-0 z-[400] flex items-start justify-center pt-12 px-4"
          style={{ backdropFilter: "blur(6px)", backgroundColor: "rgba(0,0,0,0.45)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_black] w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Month nav */}
            <div className="flex items-center justify-between px-3 py-2 border-b-2 border-black bg-[#FAF9F6]">
              <button type="button" onClick={prevMonth} className="p-1 border-2 border-black bg-white shadow-[1px_1px_0px_0px_black] active:shadow-none">
                <ChevronLeft size={12} />
              </button>
              <span className="text-[11px] font-black">{viewYear}년 {viewMonth + 1}월</span>
              <button type="button" onClick={nextMonth} className="p-1 border-2 border-black bg-white shadow-[1px_1px_0px_0px_black] active:shadow-none">
                <ChevronRight size={12} />
              </button>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 border-b border-black">
              {DAY_LABELS.map((d, i) => (
                <div
                  key={d}
                  className={`py-1.5 text-center text-[9px] font-black ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-slate-400"}`}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 p-1 gap-0.5">
              {cells.map((day, i) => {
                if (!day) return <div key={i} />;
                const dow = i % 7;
                const past = isDayBeforeToday(day);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { if (!past) pickDay(day); }}
                    disabled={past}
                    className={`aspect-square flex items-center justify-center text-[11px] font-black border-2 transition-all ${
                      past
                        ? "border-transparent text-slate-200 cursor-not-allowed line-through"
                        : isSelected(day)
                        ? "bg-[#E9967A] border-black text-white shadow-[2px_2px_0px_0px_black]"
                        : isToday(day)
                        ? "bg-[#FAF9F6] border-black text-[#E9967A]"
                        : "border-transparent hover:border-black hover:bg-[#FAF9F6]"
                    } ${!past && dow === 0 ? "text-red-400" : !past && dow === 6 ? "text-blue-400" : ""} ${isSelected(day) && !past ? "text-white" : ""}`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Past warning */}
            {isValuePast && (
              <div className="mx-2 mb-1 px-3 py-2 bg-red-50 border-2 border-red-400 flex items-center gap-2">
                <span className="text-red-500 text-[10px]">⚠</span>
                <span className="text-[9px] font-black text-red-500">현재 이후의 시간만 선택 가능해요</span>
              </div>
            )}

            {/* Time row */}
            <div className="border-t-2 border-black">
              <button
                type="button"
                onClick={() => setTimeOpen(true)}
                className="w-full flex items-center justify-between px-4 py-3 bg-[#FAF9F6] active:bg-[#F5E6D3] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Clock size={12} className={isValuePast ? "text-red-400" : "text-slate-400"} />
                  <span className={`text-[9px] font-black uppercase ${isValuePast ? "text-red-400" : "text-slate-400"}`}>시간</span>
                </div>
                <span className={`text-sm font-black border-2 border-black bg-white px-3 py-1 shadow-[2px_2px_0px_0px_black] ${isValuePast ? "text-red-400 border-red-400" : "text-black"}`}>
                  {String(selHour).padStart(2, "0")}:{String(snapMin).padStart(2, "0")}
                </span>
              </button>
            </div>

            {/* Confirm */}
            <div className="p-3 border-t-2 border-black bg-white">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full py-2.5 bg-[#162B44] text-white text-[11px] font-black border-2 border-black shadow-[3px_3px_0px_0px_black] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time modal */}
      {timeOpen && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center"
          style={{ backdropFilter: "blur(6px)", backgroundColor: "rgba(0,0,0,0.45)" }}
          onClick={() => setTimeOpen(false)}
        >
          <div
            className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_black] px-8 py-6 mx-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[10px] font-black text-slate-400 uppercase text-center mb-5 tracking-widest">
              시간 선택
            </p>
            <div className="flex items-center justify-center gap-4">
              <ScrollPicker items={HOURS} value={selHour} onChange={pickHour} />
              <span className="font-black text-2xl text-black">:</span>
              <ScrollPicker items={MINUTE_STEPS} value={snapMin} onChange={pickMin} />
            </div>
            {isValuePast && (
              <div className="mt-4 px-3 py-2 bg-red-50 border-2 border-red-400 flex items-center gap-2">
                <span className="text-red-500 text-[10px]">⚠</span>
                <span className="text-[9px] font-black text-red-500">현재 이후의 시간만 선택 가능해요</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setTimeOpen(false)}
              className="mt-4 w-full py-3 bg-[#E9967A] text-white border-2 border-black text-[11px] font-black shadow-[3px_3px_0px_0px_black] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </>
  );
}
