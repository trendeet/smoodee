"use client";

import React from "react";
import { HexColorPicker } from "react-colorful";
import { Camera, Palette, Maximize2, Square, Check } from "lucide-react";
import Button from "@/components/ui/Button";
import { ColorPalette as ApiColorPalette } from "@/lib/api/types";
import { GridLayoutType, LAYOUT_CONFIG, THICKNESS_CONFIG } from "../layoutConfig";
import { UploadSlot } from "../types";

const PRESET_COLORS = ["#FFFFFF", "#E0E0E0", "#9E9E9E", "#424242", "#000000"] as const;
const LAYOUT_VARIANTS = [
  { countLabel: "4장", variants: ["G2", "G2_GRID"] as const },
  { countLabel: "6장", variants: ["G6", "G6_GRID"] as const },
  { countLabel: "9장", variants: ["G3", "G3_GRID"] as const },
] as const;

interface Props {
  slots: (UploadSlot | null)[];
  selectedApiPalette: ApiColorPalette | null;
  gridType: GridLayoutType | null;
  frameColor: string;
  frameThickness: "none" | "thin" | "medium";
  cornerStyle: "sharp" | "rounded";
  activeTab: "color" | "width" | "radius";
  showColorPicker: boolean;
  showDesignSheet: boolean;
  frameModalStep: "closed" | "confirm" | "select";
  uploadingIndex: number | null;
  isSubmitting: boolean;

  setFrameColor: (v: string) => void;
  setFrameThickness: (v: "none" | "thin" | "medium") => void;
  setCornerStyle: (v: "sharp" | "rounded") => void;
  setActiveTab: (v: "color" | "width" | "radius") => void;
  setShowColorPicker: (v: boolean | ((prev: boolean) => boolean)) => void;
  setShowDesignSheet: (v: boolean | ((prev: boolean) => boolean)) => void;
  setFrameModalStep: (v: "closed" | "confirm" | "select") => void;

  fileInputRef: React.RefObject<HTMLInputElement | null>;
  colorPickerRef: React.RefObject<HTMLDivElement | null>;

  onSlotClick: (index: number) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onComplete: () => void;
  onGridSelect: (type: GridLayoutType) => void;

  extraModals?: React.ReactNode;
}

// ─── 공통 탭 컨텐츠 ─────────────────────────────────────────────────────────

const DesignTabContent = ({
  activeTab, frameColor, frameThickness, cornerStyle,
  showColorPicker, colorPickerRef,
  setFrameColor, setFrameThickness, setCornerStyle,
  setShowColorPicker, setActiveTab,
}: Pick<Props,
  "activeTab" | "frameColor" | "frameThickness" | "cornerStyle" |
  "showColorPicker" | "colorPickerRef" |
  "setFrameColor" | "setFrameThickness" | "setCornerStyle" |
  "setShowColorPicker" | "setActiveTab"
>) => (
  <div className="space-y-4">
    {/* 탭 버튼 */}
    <div className="flex justify-around bg-gray-50 p-1.5 rounded-2xl">
      {(["color", "width", "radius"] as const).map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all text-sm ${
            activeTab === tab ? "bg-white shadow-sm text-gray-900 font-bold" : "text-gray-400 font-medium"
          }`}
        >
          {tab === "color" && <><Palette size={15} />색상</>}
          {tab === "width" && <><Maximize2 size={15} />굵기</>}
          {tab === "radius" && <><Square size={15} />모서리</>}
        </button>
      ))}
    </div>

    {/* 탭 콘텐츠 */}
    <div className="h-16 flex items-center justify-center">
      {activeTab === "color" && (
        <div className="flex items-center gap-3">
          {PRESET_COLORS.map((hex) => (
            <button
              key={hex}
              onClick={() => { setFrameColor(hex); setShowColorPicker(false); }}
              className={`relative w-11 h-11 rounded-full transition-all ${
                frameColor === hex
                  ? "scale-110 shadow-lg ring-2 ring-offset-2 ring-gray-700"
                  : "scale-100 opacity-70 hover:opacity-100"
              } ${hex === "#FFFFFF" || hex === "#E0E0E0" ? "border border-gray-200" : ""}`}
              style={{ backgroundColor: hex }}
            >
              {frameColor === hex && (
                <Check size={14} className="absolute inset-0 m-auto drop-shadow"
                  style={{ color: hex === "#FFFFFF" || hex === "#E0E0E0" ? "#333" : "#fff" }} />
              )}
            </button>
          ))}
          <div ref={colorPickerRef} className="relative">
            {showColorPicker && (
              <div className="absolute bottom-full right-0 mb-2 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 p-3">
                <HexColorPicker color={frameColor} onChange={setFrameColor} style={{ width: 200, height: 160 }} />
              </div>
            )}
            <button
              onClick={() => setShowColorPicker((v) => !v)}
              className={`relative w-11 h-11 rounded-full border-2 border-dashed transition-all overflow-hidden border-gray-300`}
              style={{
                background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
              }}
            >
              {PRESET_COLORS.includes(frameColor as typeof PRESET_COLORS[number]) ? (
                <span className="absolute inset-0 flex items-center justify-center text-white text-lg font-bold drop-shadow">+</span>
              ) : (
                <Check size={14} className="absolute inset-0 m-auto drop-shadow" style={{ color: "#fff" }} />
              )}
            </button>
          </div>
        </div>
      )}

      {activeTab === "width" && (
        <div className="flex items-center gap-3">
          {([
            { key: "none" as const, label: "없음", p: 0, g: 0 },
            { key: "thin" as const, label: "얇게", p: 2, g: 1 },
            { key: "medium" as const, label: "굵게", p: 4, g: 2 },
          ]).map(({ key, label, p, g }) => (
            <button
              key={key}
              onClick={() => setFrameThickness(key)}
              className={`flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-2xl border-2 transition-all ${
                frameThickness === key ? "border-gray-800 bg-gray-50" : "border-gray-100 bg-white"
              }`}
            >
              {key === "none" ? (
                <div className="w-8 h-8 bg-gray-100 flex items-center justify-center rounded-md relative">
                  <div className="w-4 h-0.5 bg-gray-400 rounded-full rotate-45 absolute" />
                  <div className="w-4 h-0.5 bg-gray-400 rounded-full -rotate-45 absolute" />
                </div>
              ) : (
                <div className="w-8 h-8 bg-gray-100 rounded-md overflow-hidden" style={{ padding: p }}>
                  <div className="w-full h-full grid grid-cols-2 grid-rows-2" style={{ gap: g }}>
                    {[0, 1, 2, 3].map((i) => <div key={i} className="bg-gray-400 rounded-[1px]" />)}
                  </div>
                </div>
              )}
              <span className={`text-[10px] font-bold ${frameThickness === key ? "text-gray-900" : "text-gray-400"}`}>{label}</span>
            </button>
          ))}
        </div>
      )}

      {activeTab === "radius" && (
        <div className="flex items-center gap-3">
          {([
            { key: "sharp" as const, label: "직각" },
            { key: "rounded" as const, label: "둥글게" },
          ] as { key: "sharp" | "rounded"; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setCornerStyle(key)}
              className={`flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-2xl border-2 transition-all ${
                cornerStyle === key ? "border-gray-800 bg-gray-50" : "border-gray-100 bg-white"
              }`}
            >
              <div className="w-8 h-8 bg-gray-100 overflow-hidden" style={{ borderRadius: key === "rounded" ? 6 : 2 }}>
                <div className="w-full h-full grid grid-cols-2 grid-rows-2" style={{ gap: 2, padding: 3 }}>
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="bg-gray-400" style={{ borderRadius: key === "rounded" ? 4 : 0 }} />
                  ))}
                </div>
              </div>
              <span className={`text-[10px] font-bold ${cornerStyle === key ? "text-gray-900" : "text-gray-400"}`}>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  </div>
);

// ─── 메인 컴포넌트 ───────────────────────────────────────────────────────────

const ColorWorkStep3Body = ({
  slots, selectedApiPalette, gridType,
  frameColor, frameThickness, cornerStyle,
  activeTab, showColorPicker, showDesignSheet, frameModalStep,
  uploadingIndex, isSubmitting,
  setFrameColor, setFrameThickness, setCornerStyle,
  setActiveTab, setShowColorPicker, setShowDesignSheet, setFrameModalStep,
  fileInputRef, colorPickerRef,
  onSlotClick, onFileChange, onComplete, onGridSelect,
  extraModals,
}: Props) => {
  const tc = THICKNESS_CONFIG[frameThickness];
  const frameColorHex = frameColor;
  const filledCount = slots.filter(Boolean).length;
  const totalSlots = slots.length;
  const isComplete = filledCount === totalSlots && totalSlots > 0;

  const designTabProps = {
    activeTab, frameColor, frameThickness, cornerStyle,
    showColorPicker, colorPickerRef,
    setFrameColor, setFrameThickness, setCornerStyle,
    setShowColorPicker, setActiveTab,
  };

  return (
    <>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />

      {/* 스크롤 영역 */}
      <div className="flex-1 flex flex-col items-center justify-start pt-6 px-6 pb-4 bg-gray-50 overflow-y-auto">
        {/* 색상 칩 */}
        {selectedApiPalette && (() => {
          const rep = selectedApiPalette.colors[Math.floor(selectedApiPalette.colors.length / 2)];
          return (
            <div className="flex items-center gap-3 mb-4 bg-white rounded-2xl px-4 py-2.5 shadow-sm border border-gray-100">
              <div className="w-8 h-8 rounded-lg shrink-0" style={{ backgroundColor: rep?.hex }} />
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">선택한 색상</p>
                <p className="text-sm font-black text-gray-900">{selectedApiPalette.seed}</p>
              </div>
            </div>
          );
        })()}

        {/* 그리드 */}
        <div
          className="w-4/5 relative shadow-2xl overflow-hidden"
          style={{
            aspectRatio: gridType ? LAYOUT_CONFIG[gridType].containerStyle.aspectRatio : undefined,
            backgroundColor: frameColorHex,
          }}
        >
          <div
            className="absolute inset-0 grid"
            style={gridType ? {
              gridTemplateAreas: LAYOUT_CONFIG[gridType].containerStyle.gridTemplateAreas,
              gridTemplateColumns: LAYOUT_CONFIG[gridType].containerStyle.gridTemplateColumns,
              gridTemplateRows: LAYOUT_CONFIG[gridType].containerStyle.gridTemplateRows,
              gap: `${tc.gap}px`,
              padding: `${tc.pad}px`,
            } : undefined}
          >
            {slots.map((slot, i) => (
              <div
                key={i}
                onClick={() => uploadingIndex === null && onSlotClick(i)}
                className={`relative overflow-hidden cursor-pointer transition-all active:scale-95 ${
                  slot ? "" : "bg-gray-100 hover:bg-gray-200"
                } flex items-center justify-center min-h-0 min-w-0 ${
                  cornerStyle === "rounded" ? "rounded-2xl" : ""
                }`}
                style={{
                  ...(slot ? { backgroundColor: frameColorHex } : {}),
                  ...(gridType ? { gridArea: LAYOUT_CONFIG[gridType].areas[i] } : {}),
                }}
              >
                {uploadingIndex === i ? (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : slot?.url ? (
                  <img src={slot.url} alt="slot" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <Camera className="text-gray-400" />
                )}
              </div>
            ))}
          </div>
        </div>

        <p className="mt-4 text-sm text-gray-400 font-medium">
          각 프레임을 눌러 사진을 채워주세요!
        </p>

        {/* 데스크탑 전용 인라인 컨트롤 패널 */}
        <div className="hidden md:block mt-4 w-full bg-white rounded-3xl shadow-sm border border-gray-100 p-4">
          <DesignTabContent {...designTabProps} />
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="px-6 pt-3 pb-safe bg-white border-t border-gray-100 space-y-3">
        {/* 모바일 전용 디자인 옵션 버튼 */}
        <button
          onClick={() => setShowDesignSheet(true)}
          className="md:hidden w-full py-3 flex items-center justify-center gap-2 bg-gray-50 text-gray-700 rounded-2xl font-bold border border-gray-200 hover:bg-gray-100 transition-colors text-sm"
        >
          <Palette size={16} />
          디자인 옵션
        </button>
        <Button size="lg" disabled={!isComplete || isSubmitting} onClick={onComplete}>
          {isSubmitting ? "렌더링 중..." : "완성하기"}
        </Button>
      </div>

      {/* 프레임 변경 모달 */}
      {frameModalStep !== "closed" && (
        <div className="absolute inset-0 z-50 flex items-end bg-black/40" onClick={() => setFrameModalStep("closed")}>
          <div className="bg-white w-full rounded-t-3xl p-6 pb-safe" onClick={(e) => e.stopPropagation()}>
            {frameModalStep === "confirm" ? (
              <>
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-14 h-14 bg-orange-50 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <h2 className="text-xl font-black text-gray-900">프레임을 바꾸시겠어요?</h2>
                  <p className="text-sm text-gray-500 font-medium mt-2">기존에 저장된 이미지가 모두 삭제됩니다.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setFrameModalStep("closed")}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-2xl text-sm font-bold hover:bg-gray-200 transition-colors">취소</button>
                  <button onClick={() => setFrameModalStep("select")}
                    className="flex-1 py-3 bg-black text-white rounded-2xl text-sm font-bold hover:bg-gray-800 transition-colors">프레임 바꾸기</button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-black mb-4">프레임 수 변경</h2>
                <div className="flex flex-col gap-4">
                  {LAYOUT_VARIANTS.map(({ countLabel, variants }) => (
                    <div key={countLabel}>
                      <p className="text-xs font-bold text-gray-400 mb-2">{countLabel}</p>
                      <div className="flex gap-2">
                        {variants.map((type) => {
                          const cfg = LAYOUT_CONFIG[type];
                          const isSelected = gridType === type;
                          return (
                            <button key={type}
                              onClick={() => { onGridSelect(type); setFrameModalStep("closed"); }}
                              className={`flex-1 border-2 rounded-2xl p-3 flex flex-col items-center gap-2 transition-all ${
                                isSelected ? "border-black bg-gray-50" : "border-gray-100 hover:border-gray-300"
                              }`}
                            >
                              <div className="grid gap-[3px]" style={{
                                gridTemplateAreas: cfg.previewAreas,
                                gridTemplateColumns: cfg.containerStyle.gridTemplateColumns,
                                gridTemplateRows: cfg.containerStyle.gridTemplateRows,
                                width: cfg.previewSize.width,
                                height: cfg.previewSize.height,
                              }}>
                                {cfg.previewCells.map((area) => (
                                  <div key={area}
                                    className={`rounded-[2px] ${isSelected ? "bg-gray-400" : "bg-gray-200"}`}
                                    style={{ gridArea: area }} />
                                ))}
                              </div>
                              <span className={`text-xs font-bold ${isSelected ? "text-gray-900" : "text-gray-400"}`}>
                                {cfg.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 모바일 전용 디자인 바텀시트 */}
      {showDesignSheet && (
        <div
          className="md:hidden absolute inset-0 z-50 flex items-end bg-black/40"
          onClick={() => { setShowDesignSheet(false); setShowColorPicker(false); }}
        >
          <div className="bg-white w-full rounded-t-3xl p-6 pb-safe" onClick={(e) => e.stopPropagation()}>
            <DesignTabContent {...designTabProps} />
          </div>
        </div>
      )}

      {/* 부모별 추가 모달 (임시저장 완료, 로그인 필요 등) */}
      {extraModals}
    </>
  );
};

export default ColorWorkStep3Body;
