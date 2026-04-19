"use client";

import React, { useEffect, useRef, useState } from "react";

interface ScrollTimePickerProps {
  value: string; // "HH:MM"
  onChange: (value: string) => void;
  onClose: () => void;
}

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;
const MINUTES = [0, 15, 30, 45];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function ScrollColumn({
  items,
  selectedIndex,
  onSelect,
}: {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = selectedIndex * ITEM_HEIGHT;
    }
  }, []);

  const handleScroll = () => {
    if (!ref.current) return;
    const index = Math.round(ref.current.scrollTop / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(items.length - 1, index));
    onSelect(clamped);
  };

  const handleScrollEnd = () => {
    if (!ref.current) return;
    const index = Math.round(ref.current.scrollTop / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(items.length - 1, index));
    ref.current.scrollTo({ top: clamped * ITEM_HEIGHT, behavior: "smooth" });
    onSelect(clamped);
  };

  return (
    <div className="relative flex-1">
      <div
        ref={ref}
        onScroll={handleScroll}
        onScrollEnd={handleScrollEnd}
        className="overflow-y-scroll no-scrollbar"
        style={{
          height: ITEM_HEIGHT * VISIBLE_ITEMS,
          scrollSnapType: "y mandatory",
        }}
      >
        {/* top padding */}
        <div style={{ height: ITEM_HEIGHT * 2 }} />
        {items.map((item, i) => (
          <div
            key={item}
            onClick={() => {
              onSelect(i);
              ref.current?.scrollTo({ top: i * ITEM_HEIGHT, behavior: "smooth" });
            }}
            className="flex items-center justify-center cursor-pointer transition-all"
            style={{
              height: ITEM_HEIGHT,
              scrollSnapAlign: "center",
              fontSize: i === selectedIndex ? 26 : 18,
              fontWeight: i === selectedIndex ? 700 : 400,
              color: i === selectedIndex ? "#111" : "#bbb",
            }}
          >
            {item}
          </div>
        ))}
        {/* bottom padding */}
        <div style={{ height: ITEM_HEIGHT * 2 }} />
      </div>
    </div>
  );
}

export default function ScrollTimePicker({
  value,
  onChange,
  onClose,
}: ScrollTimePickerProps) {
  const [h, m] = value.split(":").map(Number);
  const [hourIndex, setHourIndex] = useState(h);
  const [minuteIndex, setMinuteIndex] = useState(MINUTES.indexOf(m) === -1 ? 0 : MINUTES.indexOf(m));

  const hours = Array.from({ length: 24 }, (_, i) => pad(i));
  const minutes = MINUTES.map((m) => pad(m));

  const handleConfirm = () => {
    onChange(`${pad(hourIndex)}:${pad(MINUTES[minuteIndex])}`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-8"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-xs bg-white rounded-3xl px-6 pt-6 pb-6 shadow-xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex gap-2">
          {/* 선택 인디케이터 */}
          <div
            className="absolute left-0 right-0 rounded-2xl bg-gray-100 pointer-events-none"
            style={{
              top: ITEM_HEIGHT * 2,
              height: ITEM_HEIGHT,
            }}
          />

          <ScrollColumn
            items={hours}
            selectedIndex={hourIndex}
            onSelect={setHourIndex}
          />

          <div
            className="flex items-center justify-center font-bold text-gray-400 shrink-0"
            style={{ paddingTop: ITEM_HEIGHT * 2, height: ITEM_HEIGHT * VISIBLE_ITEMS }}
          >
            :
          </div>

          <ScrollColumn
            items={minutes}
            selectedIndex={minuteIndex}
            onSelect={setMinuteIndex}
          />
        </div>

        <button
          onClick={handleConfirm}
          className="mt-6 w-full py-4 rounded-2xl font-bold text-white text-base transition-all active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #4dd8c0, #2ab8a0)" }}
        >
          확인
        </button>
      </div>
    </div>
  );
}
