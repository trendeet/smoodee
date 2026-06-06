"use client";

import React, { useState } from "react";
import { X, Archive, Layers } from "lucide-react";
import { ManittoItemResponse } from "../types";
import { PixelGift, PixelMail, PixelKey } from "./PixelArts";

interface PixelLockerModalProps {
  objects: ManittoItemResponse[];
  onClose: () => void;
}

type Tab = "all" | "GIFT" | "MESSAGE" | "HINT";

function TabButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center py-3 border-r-2 last:border-r-0 border-black transition-all ${
        active ? "bg-[#F5E6D3] text-black" : "bg-white text-slate-300 hover:bg-[#FAF9F6]"
      }`}
    >
      <div className={active ? "text-black" : "text-slate-300"}>{icon}</div>
      <span className={`text-[9px] mt-1 font-black ${active ? "text-black" : "text-slate-300"}`}>
        {label}
      </span>
    </button>
  );
}

const PixelLockerModal = ({ objects, onClose }: PixelLockerModalProps) => {
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const filtered = objects.filter((obj) => activeTab === "all" || obj.type === activeTab);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white border-4 border-black w-full max-w-sm shadow-[10px_10px_0px_0px_black] flex flex-col h-[70vh]">
        <div className="p-4 bg-[#162B44] text-white border-b-4 border-black flex justify-between items-center">
          <h3 className="text-xs font-black uppercase flex items-center gap-2">
            <PixelGift size={20} /> 마니또가 두고간 선물!
          </h3>
          <button
            onClick={onClose}
            className="p-1 border-2 border-white hover:bg-white hover:text-[#162B44] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex border-b-4 border-black bg-[#FAF9F6]">
          <TabButton active={activeTab === "all"} onClick={() => setActiveTab("all")} label="전체" icon={<Layers size={14} />} />
          <TabButton active={activeTab === "GIFT"} onClick={() => setActiveTab("GIFT")} label="선물" icon={<PixelGift size={14} />} />
          <TabButton active={activeTab === "MESSAGE"} onClick={() => setActiveTab("MESSAGE")} label="메시지" icon={<PixelMail size={14} />} />
          <TabButton active={activeTab === "HINT"} onClick={() => setActiveTab("HINT")} label="힌트" icon={<PixelKey size={14} />} />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAF9F6]">
          {filtered.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-3">
              <Archive size={48} className="text-slate-200" />
              <p className="text-[11px] font-black uppercase">아이템이 없습니다</p>
            </div>
          ) : (
            filtered.map((obj) => (
              <div
                key={obj.id}
                className="bg-white border-2 border-slate-200 p-3 flex items-center gap-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)] hover:border-black transition-colors"
              >
                <div className="p-2 border-2 border-black bg-[#F5E6D3]">
                  {obj.type === "GIFT" && <PixelGift size={20} skin={obj.skin} />}
                  {obj.type === "MESSAGE" && <PixelMail size={20} skin={obj.skin} />}
                  {obj.type === "HINT" && <PixelKey size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-slate-800 truncate">{obj.content}</p>
                  <p className="text-[9px] font-bold text-slate-300 uppercase">
                    {obj.type} • {obj.isOpened ? "열람함" : "새로운 아이템"}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PixelLockerModal;
