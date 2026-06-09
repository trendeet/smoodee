"use client";

import React, { useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { ManittoItemType } from "../types";
import { PixelGift, PixelMail, PixelKey } from "./PixelArts";

export interface DropData {
  type: ManittoItemType;
  skin: number;
  content: string;
  imageFile?: File;
  wantToShare: boolean;
}

interface PixelDropModalProps {
  onClose: () => void;
  onSave: (data: DropData) => void;
}

function TypeButton({
  active,
  onClick,
  icon,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-3 border-2 border-black transition-all ${
        active
          ? "bg-[#F5E6D3] border-black shadow-[inset_3px_3px_0px_0px_rgba(0,0,0,0.05)]"
          : "bg-[#FAF9F6] text-slate-300 border-slate-200"
      }`}
      style={{
        borderBottomWidth: active ? "2px" : "4px",
        color: active ? color : "",
      }}
    >
      <div className="flex justify-center items-center">{icon}</div>
      <span className={`text-[9px] font-black ${active ? "text-black" : "text-slate-300"}`}>
        {label}
      </span>
    </button>
  );
}

const PixelDropModal = ({ onClose, onSave }: PixelDropModalProps) => {
  const [type, setType] = useState<ManittoItemType>("GIFT");
  const [skin, setSkin] = useState(0);
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [wantToShare, setWantToShare] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTypeChange = (t: ManittoItemType) => {
    setType(t);
    setSkin(0);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setWantToShare(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm text-black">
      <div className="bg-white border-4 border-black w-full max-w-xs shadow-[8px_8px_0px_0px_black] p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-sm font-black uppercase text-[#E9967A]">아이템 남기기</h3>
          <button onClick={onClose} className="p-1 border-2 border-black bg-white">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-6">
          <TypeButton active={type === "GIFT"} onClick={() => handleTypeChange("GIFT")} icon={<PixelGift size={20} />} label="선물" color="#E9967A" />
          <TypeButton active={type === "MESSAGE"} onClick={() => handleTypeChange("MESSAGE")} icon={<PixelMail size={20} />} label="메시지" color="#162B44" />
          <TypeButton active={type === "HINT"} onClick={() => handleTypeChange("HINT")} icon={<PixelKey size={20} />} label="힌트" color="#adb5bd" />
        </div>

        {(type === "GIFT" || type === "MESSAGE") && (
          <div className="mb-6">
            <p className="text-[9px] font-black text-slate-400 mb-2 uppercase">디자인 선택</p>
            <div className="flex gap-4 justify-between">
              {[0, 1, 2].map((i) => (
                <button
                  key={i}
                  onClick={() => setSkin(i)}
                  className={`flex-1 p-2 border-4 transition-all ${
                    skin === i
                      ? "border-black bg-[#F5E6D3]"
                      : "border-transparent bg-[#FAF9F6] hover:bg-slate-100"
                  }`}
                >
                  <div className="flex justify-center">
                    {type === "GIFT" ? <PixelGift size={32} skin={i} /> : <PixelMail size={32} skin={i} />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <textarea
          placeholder="여기에 마음을 적어주세요..."
          className="w-full h-24 bg-[#FAF9F6] border-2 border-slate-100 p-3 text-[11px] font-bold focus:outline-none focus:border-black mb-4 resize-none text-black"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        {/* 인증 이미지 첨부 */}
        <div className="mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleImageChange}
          />
          {imagePreview ? (
            <div className="relative border-2 border-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="인증 미리보기" className="w-full h-32 object-cover" />
              <button
                onClick={removeImage}
                className="absolute top-1 right-1 bg-black text-white p-0.5 border border-white"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 border-2 border-dashed border-slate-300 text-[10px] font-black text-slate-400 flex items-center justify-center gap-2 hover:border-black hover:text-black transition-colors"
            >
              <Camera size={14} /> 인증샷 첨부 (선택)
            </button>
          )}
        </div>

        {/* 자랑해줘 토글 */}
        {imageFile && (
          <button
            onClick={() => setWantToShare(!wantToShare)}
            className={`w-full mb-4 py-2 border-2 border-black text-[11px] font-black transition-all flex items-center justify-center gap-2 ${
              wantToShare
                ? "bg-[#162B44] text-white shadow-[3px_3px_0px_0px_black]"
                : "bg-white text-slate-500"
            }`}
          >
            {wantToShare ? "✓ 마니띠에게 자랑할게요! 🎉" : "자랑해줘! 🎉 (마니띠 승인 후 게시판에 공유)"}
          </button>
        )}

        <button
          disabled={!content}
          onClick={() => onSave({ type, content, skin, imageFile: imageFile ?? undefined, wantToShare })}
          className={`w-full py-4 border-4 border-black font-black text-xs shadow-[4px_4px_0px_0px_black] transition-all ${
            content ? "bg-[#E9967A] text-white" : "bg-slate-100 text-slate-300 cursor-not-allowed"
          }`}
        >
          살짝 놓고 가기
        </button>
      </div>
    </div>
  );
};

export default PixelDropModal;
