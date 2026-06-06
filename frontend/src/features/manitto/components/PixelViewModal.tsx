"use client";

import React from "react";
import { Archive } from "lucide-react";
import { ManittoItemResponse } from "../types";
import { PixelGift, PixelMail, PixelKey } from "./PixelArts";

interface PixelViewModalProps {
  obj: ManittoItemResponse;
  isMine: boolean;
  onClose: () => void;
  onStoreInLocker?: () => void;
}

const colorMap: Record<string, string> = {
  GIFT: "#E9967A",
  MESSAGE: "#162B44",
  HINT: "#adb5bd",
};

const PixelViewModal = ({ obj, isMine, onClose, onStoreInLocker }: PixelViewModalProps) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm text-black">
    <div className="bg-white border-4 border-black w-full max-w-xs shadow-[10px_10px_0px_0px_black] overflow-hidden">
      <div
        className="h-24 flex items-center justify-center border-b-4 border-black"
        style={{ backgroundColor: (colorMap[obj.type] ?? "#E9967A") + "15" }}
      >
        {obj.type === "GIFT" && <PixelGift size={40} skin={obj.skin} />}
        {obj.type === "MESSAGE" && <PixelMail size={40} skin={obj.skin} />}
        {obj.type === "HINT" && <PixelKey size={40} />}
      </div>
      <div className="p-7 text-center">
        <p className="text-[10px] font-black text-slate-300 mb-2 tracking-widest uppercase">
          From Your Manitto
        </p>
        <div className="bg-[#FAF9F6] border-2 border-slate-100 p-5 mb-6 text-[12px] font-black leading-relaxed italic text-black">
          &ldquo;{obj.content}&rdquo;
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-white border-2 border-black font-black text-[11px] shadow-[3px_3px_0px_0px_black] active:shadow-none text-black"
          >
            닫기
          </button>
          {isMine && onStoreInLocker && (
            <button
              onClick={onStoreInLocker}
              className="flex-1 py-3 bg-[#162B44] text-white border-2 border-black font-black text-[10px] shadow-[3px_3px_0px_0px_black] active:shadow-none flex items-center justify-center gap-1.5"
            >
              <Archive size={14} /> 사물함에 담기
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
);

export default PixelViewModal;
