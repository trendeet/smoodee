"use client";

import React from "react";
import { Download, Share2 } from "lucide-react";
import { ColorPalette as ApiColorPalette } from "@/lib/api/types";
import { GridLayoutType, LAYOUT_CONFIG, THICKNESS_CONFIG } from "../layoutConfig";
import { UploadSlot } from "../types";

interface Props {
  slots: (UploadSlot | null)[];
  selectedApiPalette: ApiColorPalette | null;
  gridType: GridLayoutType | null;
  frameColorHex: string;
  tc: (typeof THICKNESS_CONFIG)[keyof typeof THICKNESS_CONFIG];
  cornerStyle: "sharp" | "rounded";
  isDownloading: boolean;
  onDownload: () => void;
  onShare: () => void;
  onHome: () => void;
  savedNotice?: React.ReactNode;
}

const ColorWorkStep4Body = ({
  slots,
  selectedApiPalette,
  gridType,
  frameColorHex,
  tc,
  cornerStyle,
  isDownloading,
  onDownload,
  onShare,
  onHome,
  savedNotice,
}: Props) => {
  const layoutCfg = gridType ? LAYOUT_CONFIG[gridType] : null;

  return (
    <>
      <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto no-scrollbar">
        <div
          className="shadow-2xl mb-4 w-full max-w-[320px] relative overflow-hidden ring-4 ring-white/20"
          style={{
            aspectRatio: layoutCfg?.containerStyle.aspectRatio ?? "1/1",
            backgroundColor: frameColorHex,
          }}
        >
          <div
            className="absolute inset-0 grid overflow-hidden"
            style={{
              gridTemplateAreas: layoutCfg?.containerStyle.gridTemplateAreas,
              gridTemplateColumns: layoutCfg?.containerStyle.gridTemplateColumns,
              gridTemplateRows: layoutCfg?.containerStyle.gridTemplateRows,
              gap: `${tc.gap}px`,
              padding: `${tc.pad}px`,
            }}
          >
            {slots.map((slot, i) => (
              <div
                key={i}
                className={`relative min-h-0 min-w-0 bg-gray-200 overflow-hidden ${
                  cornerStyle === "rounded" ? "rounded-2xl" : ""
                }`}
                style={{
                  gridArea: layoutCfg ? LAYOUT_CONFIG[gridType!].areas[i] : undefined,
                }}
              >
                {slot?.url && (
                  <img
                    src={slot.url}
                    alt="filled slot"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <p className="text-gray-500 text-sm font-medium text-center mt-1">
          #컬러워크 #{selectedApiPalette?.colors[0]?.name ?? "mood"} #{slots.length}cuts
        </p>
        {savedNotice && (
          <div className="mt-4">{savedNotice}</div>
        )}
      </div>

      <div className="p-6 pb-safe safe-area-bottom space-y-3 bg-white border-t border-gray-100">
        <div className="flex gap-3">
          <button
            onClick={onDownload}
            disabled={isDownloading}
            className="flex-1 flex items-center justify-center gap-2 py-4 bg-white text-black font-medium rounded-xl shadow-xl hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-50 text-base"
          >
            {isDownloading ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
            ) : (
              <Download size={18} />
            )}
            다운로드
          </button>
          <button
            onClick={onShare}
            disabled={isDownloading}
            className="flex-1 flex items-center justify-center gap-2 py-4 bg-white text-black font-medium rounded-xl shadow-xl hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-50 text-base"
          >
            <Share2 size={18} />
            공유
          </button>
        </div>
        <button
          onClick={onHome}
          className="w-full py-3 text-gray-500 text-sm font-bold hover:text-gray-800 transition-colors"
        >
          홈으로
        </button>
      </div>
    </>
  );
};

export default ColorWorkStep4Body;
