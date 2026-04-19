"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

interface MockResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 현재 그룹 인원 (기본 선택 탭) */
  memberCount?: number;
  /** 미사용 — 하위 호환용 */
  slots?: unknown[];
}

const MEMBER_COLORS = [
  { bg: "#FF6B6B", label: "#fff" },
  { bg: "#4ECDC4", label: "#fff" },
  { bg: "#45B7D1", label: "#fff" },
  { bg: "#96CEB4", label: "#fff" },
  { bg: "#FFEAA7", label: "#555" },
  { bg: "#DDA0DD", label: "#fff" },
  { bg: "#98D8C8", label: "#444" },
  { bg: "#FFB347", label: "#fff" },
];

const MEMBER_NAMES = ["나", "친구1", "친구2", "친구3", "친구4", "친구5", "친구6", "친구7"];

const SLOT_TIMES = ["08:00", "12:00", "18:00", "22:00"];

type Count = 5 | 6 | 7 | 8;
const COUNTS: Count[] = [5, 6, 7, 8];

const OUTPUT_W = 720;
const OUTPUT_H = 1280;

function getLayout(n: number) {
  const twoCol = n >= 6;
  const cols = twoCol ? 2 : 1;
  const gridRows = twoCol ? Math.ceil(n / 2) : n;
  const cellW = OUTPUT_W / cols;
  const cellH = OUTPUT_H / gridRows;
  return { twoCol, cols, gridRows, cellW, cellH };
}

/** 단일 슬롯 프레임을 렌더 */
function FramePreview({ n, slotIdx }: { n: number; slotIdx: number }) {
  const { twoCol, cols, gridRows, cellW, cellH } = getLayout(n);
  const aspectW = OUTPUT_W;
  const aspectH = OUTPUT_H;

  // phantom 포함 총 셀 수
  const totalCells = twoCol && n % 2 === 1 ? n + 1 : n;

  const cells = Array.from({ length: totalCells }, (_, i) => ({
    isPhantom: i >= n,
    color: MEMBER_COLORS[i % MEMBER_COLORS.length],
    name: MEMBER_NAMES[i] ?? `멤버${i + 1}`,
  }));

  return (
    <div
      className="relative w-full overflow-hidden bg-black rounded-xl"
      style={{ aspectRatio: `${aspectW}/${aspectH}` }}
    >
      {/* Grid */}
      <div
        className="absolute inset-0"
        style={{
          display: "grid",
          gridTemplateColumns: twoCol ? "1fr 1fr" : "1fr",
          gridTemplateRows: `repeat(${gridRows}, 1fr)`,
        }}
      >
        {cells.map((cell, i) => (
          <div
            key={i}
            className="relative flex items-center justify-center overflow-hidden"
            style={{
              background: cell.isPhantom
                ? "#1a1a1a"
                : cell.color.bg,
            }}
          >
            {!cell.isPhantom && (
              <>
                {/* 멤버 이름 레이블 */}
                <span
                  className="font-black text-center leading-tight px-2"
                  style={{
                    color: cell.color.label,
                    fontSize: "clamp(10px, 3vw, 22px)",
                    textShadow: "0 1px 4px rgba(0,0,0,0.3)",
                  }}
                >
                  {cell.name}
                </span>
                {/* 하단 인덱스 뱃지 */}
                <div
                  className="absolute bottom-1.5 left-2 rounded-md px-1.5 py-0.5 text-[9px] font-bold"
                  style={{
                    background: "rgba(0,0,0,0.35)",
                    color: "#fff",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  {cell.name}
                </div>
              </>
            )}
            {cell.isPhantom && (
              <span
                className="text-white/20 font-bold"
                style={{ fontSize: "clamp(8px, 2vw, 14px)" }}
              >
                비어있음
              </span>
            )}
          </div>
        ))}
      </div>

      {/* 행 경계 시간 레이블 (단일 슬롯 미리보기라 1개만 보임 — 슬롯 시간 표시) */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: gridRows - 1 }, (_, r) => {
          const topPct = ((r + 1) / gridRows) * 100;
          return (
            <div
              key={r}
              className="absolute left-0 right-0 flex items-center justify-center"
              style={{ top: `calc(${topPct}% - 1px)` }}
            >
              <div
                className="px-3 py-0.5 rounded-full text-white font-bold"
                style={{
                  background: "rgba(0,0,0,0.55)",
                  backdropFilter: "blur(6px)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  fontSize: "clamp(8px, 2.5vw, 13px)",
                  transform: "translateY(-50%)",
                }}
              >
                {SLOT_TIMES[r % SLOT_TIMES.length]}
              </div>
            </div>
          );
        })}
      </div>

      {/* 슬롯 진행 타임라인 (하단) */}
      <div className="absolute bottom-0 left-0 right-0 flex gap-0.5 p-1.5">
        {SLOT_TIMES.slice(0, 4).map((t, i) => (
          <div
            key={i}
            className="flex-1 rounded-full h-1"
            style={{
              background: i === slotIdx ? "#fff" : "rgba(255,255,255,0.25)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

const MockResultModal = ({
  isOpen,
  onClose,
  memberCount = 5,
}: MockResultModalProps) => {
  const clampedDefault = Math.min(8, Math.max(5, memberCount)) as Count;
  const [selected, setSelected] = useState<Count>(
    COUNTS.includes(clampedDefault) ? clampedDefault : 5
  );
  const [slotIdx, setSlotIdx] = useState(0);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-sm overflow-hidden flex flex-col"
        style={{ maxHeight: "92dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <div>
            <h2 className="font-black text-lg text-gray-900">레이아웃 미리보기</h2>
            <p className="text-xs text-gray-400 mt-0.5">인원별 영상 결과물 레이아웃</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0"
          >
            <X size={18} className="text-gray-600" />
          </button>
        </div>

        {/* 인원 탭 */}
        <div className="flex gap-2 px-5 pb-3 shrink-0">
          {COUNTS.map((c) => (
            <button
              key={c}
              onClick={() => setSelected(c)}
              className="flex-1 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
              style={
                selected === c
                  ? {
                      background: "#111",
                      color: "#fff",
                      boxShadow: "3px 3px 0 rgba(0,0,0,0.15)",
                    }
                  : {
                      background: "#F8FAFC",
                      color: "#555",
                      border: "2px solid #ddd",
                    }
              }
            >
              {c}명
            </button>
          ))}
        </div>

        {/* 레이아웃 설명 */}
        <div className="px-5 pb-2 shrink-0">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
            style={{ background: "#F8FAFC", border: "1.5px solid #e5e7eb" }}
          >
            <span className="text-gray-500">
              {selected >= 6
                ? `${selected}명 → 2열 × ${Math.ceil(selected / 2)}행 그리드${selected % 2 === 1 ? " (마지막 칸 비어있음)" : ""}`
                : `${selected}명 → 1열 × ${selected}행 세로 배치`}
            </span>
          </div>
        </div>

        {/* 프레임 미리보기 */}
        <div className="px-5 pb-2 flex-1 min-h-0 flex items-start">
          <div className="w-full">
            <FramePreview n={selected} slotIdx={slotIdx} />
          </div>
        </div>

        {/* 슬롯 선택 (타임라인 시뮬레이션) */}
        <div className="px-5 pb-5 shrink-0">
          <p className="text-[11px] text-gray-400 font-medium mb-2">슬롯 (시간대)</p>
          <div className="flex gap-2">
            {SLOT_TIMES.map((t, i) => (
              <button
                key={i}
                onClick={() => setSlotIdx(i)}
                className="flex-1 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                style={
                  slotIdx === i
                    ? {
                        background: "#111",
                        color: "#fff",
                        boxShadow: "2px 2px 0 rgba(0,0,0,0.15)",
                      }
                    : {
                        background: "#F8FAFC",
                        color: "#888",
                        border: "1.5px solid #e5e7eb",
                      }
                }
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockResultModal;
