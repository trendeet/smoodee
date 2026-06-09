"use client";

import React, { useState, useRef } from "react";
import { X, Heart, Star, Ghost, MessageCircle } from "lucide-react";
import { ManittoItemResponse, ManittoVisitResponse } from "../types";
import {
  PixelFootprints,
  PixelGift,
  PixelMail,
  PixelKey,
} from "../components/PixelArts";
import PixelLockerModal from "../components/PixelLockerModal";
import PixelDropModal from "../components/PixelDropModal";
import PixelViewModal from "../components/PixelViewModal";
import { GREETING_PRESETS } from "../constants/gameConfig";

interface RoomViewProps {
  ownerName: string;
  wallColor: string;
  ownerAvatarColor: string;
  myAvatarColor: string;
  objects: ManittoItemResponse[];
  visits: ManittoVisitResponse[];
  isMine: boolean;
  canInteract: boolean;
  otherUserPresent: boolean;
  remoteGreetingBubble: string | null;
  onBack: () => void;
  onDrop: (data: {
    type: ManittoItemResponse["type"];
    skin: number;
    content: string;
    posX: number;
    posY: number;
  }) => void;
  onOpenObject: (id: number) => void;
  onStoreInLocker: (id: number) => void;
  onSendGreet: (text: string) => void;
}

const RoomView = ({
  ownerName,
  wallColor,
  ownerAvatarColor,
  myAvatarColor,
  objects,
  visits,
  isMine,
  canInteract,
  otherUserPresent,
  remoteGreetingBubble,
  onBack,
  onDrop,
  onOpenObject,
  onStoreInLocker,
  onSendGreet,
}: RoomViewProps) => {
  const [showDropModal, setShowDropModal] = useState(false);
  const [showLockerModal, setShowLockerModal] = useState(false);
  const [showGreetingMenu, setShowGreetingMenu] = useState(false);
  const [menuFixedPos, setMenuFixedPos] = useState({ bottom: 0, left: 0 });
  const charRef = useRef<HTMLDivElement>(null);
  const [selectedObj, setSelectedObj] = useState<ManittoItemResponse | null>(
    null
  );
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [greetingBubble, setGreetingBubble] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState({ x: 100, y: 300 });

  const visitorOffset = { x: 110, y: 0 };

  const handleFloorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (y < 130) return;
    if (isMine || !canInteract) return;
    setSelectedPosition({ x, y });
    setShowDropModal(true);
  };

  const handleGreet = (text: string) => {
    setGreetingBubble(text);
    setShowGreetingMenu(false);
    setTimeout(() => setGreetingBubble(null), 2500);
    onSendGreet(text);
  };

  const floorObjects = objects.filter((o) => !o.inLocker);
  const lockerObjects = objects.filter((o) => o.inLocker);

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-[#FAF9F6]">
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <button
          onClick={onBack}
          className="bg-white border-2 border-black p-2 shadow-[2px_2px_0px_0px_black] active:shadow-none text-black"
        >
          <X size={18} />
        </button>
        <div className="bg-[#FAF9F6] border-2 border-black px-4 py-2 font-black text-[11px] shadow-[2px_2px_0px_0px_black] text-black">
          {ownerName.toUpperCase()}
        </div>
      </div>

      <div
        className={`flex-1 relative overflow-hidden ${"cursor-pointer"} flex flex-col`}
        onClick={(e) => {
          handleFloorClick(e);
          if (showGreetingMenu) setShowGreetingMenu(false);
        }}
      >
        {/* Wall */}
        <div
          className="h-[130px] border-b-4 border-black relative transition-colors duration-500"
          style={{ backgroundColor: wallColor }}
        >
          <div className="absolute top-6 left-1/2 -translate-x-1/2 w-10 h-14 border-4 border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] flex items-center justify-center">
            <Heart size={22} className="text-[#E9967A]" fill="#E9967A" />
          </div>
          <div className="absolute bottom-2 left-[15%] w-10 h-8 border-4 border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] flex items-center justify-center">
            <Star size={14} fill="#DAA520" color="#DAA520" />
          </div>
          <div className="absolute bottom-8 right-[12%] w-20 h-10 border-4 border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] flex items-center justify-center">
            <Ghost size={22} fill="#162B44" color="#162B44" />
          </div>
        </div>

        {/* Floor */}
        <div
          className="flex-1 relative bg-white"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.02) 50%, transparent 50%), linear-gradient(rgba(0,0,0,.02) 50%, transparent 50%)`,
            backgroundSize: "80px 40px",
            backgroundPosition: "0 0, 40px 20px",
          }}
        >
          {/* Footprints — 내 방: 서버 데이터, 남의 방: 없음 */}
          {visits.map((v, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: Math.max(0, v.posX - 16),
                top: Math.max(4, v.posY - 130 - 16),
              }}
            >
              <PixelFootprints />
            </div>
          ))}

          {/* Locker */}
          <div
            className={`absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center group z-20 ${
              canInteract ? "cursor-pointer" : "cursor-default"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              if (canInteract) setShowLockerModal(true);
            }}
          >
            <div className="w-20 h-28 bg-[#FAF9F6] border-4 border-black shadow-[6px_6px_0px_0px_black] relative overflow-hidden active:translate-x-[2px] active:translate-y-[2px] transition-all">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-[#162B44]" />
              <div className="absolute top-6 left-2 right-2 h-1 bg-black opacity-10" />
              <div className="absolute top-14 left-2 right-2 h-1 bg-black opacity-10" />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-6 bg-[#E9967A] border-2 border-black" />
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[7px] text-white font-black bg-[#162B44] px-1.5 py-0.5 border border-black shadow-[1px_1px_0_0_black]">
                사물함
              </div>
            </div>
          </div>

          {/* 내 방에 방문자가 있을 때 — 익명 캐릭터 */}
          {isMine && otherUserPresent && (
            <div
              className="absolute flex flex-col items-center z-10"
              style={{
                left: `calc(50% + ${visitorOffset.x}px)`,
                bottom: "33.33%",
                transform: "translateX(-50%)",
              }}
            >
              <div className="relative">
                {remoteGreetingBubble && (
                  <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-white border-2 border-black px-4 py-2 text-[10px] font-black shadow-[4px_4px_0px_0px_black] text-[#162B44] animate-bounce z-50 whitespace-nowrap">
                    {remoteGreetingBubble}
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: "50%",
                        marginLeft: "-8px",
                        width: 0,
                        height: 0,
                        borderLeft: "8px solid transparent",
                        borderRight: "8px solid transparent",
                        borderTop: "8px solid black",
                      }}
                    />
                  </div>
                )}
                <div
                  className="w-14 h-14 border-4 border-black shadow-[4px_4px_0px_0px_black] flex items-center justify-center"
                  style={{ backgroundColor: "#9CA3AF" }}
                >
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-white" />
                    <div className="w-2 h-2 bg-white animate-pulse" />
                  </div>
                </div>
              </div>
              <div className="mt-2 bg-black text-white text-[8px] px-3 py-1 font-black uppercase shadow-[2px_2px_0px_0px_black]">
                ???
              </div>
            </div>
          )}

          {/* 방 주인 캐릭터 (남의 방에 들어왔을 때, 주인이 접속 중일 때만 표시) */}
          {!isMine && otherUserPresent && (
            <div
              className="absolute flex flex-col items-center z-10"
              style={{
                left: "50%",
                bottom: "33.33%",
                transform: "translateX(-50%)",
              }}
            >
              <div className="relative">
                {remoteGreetingBubble && (
                  <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-white border-2 border-black px-4 py-2 text-[10px] font-black shadow-[4px_4px_0px_0px_black] text-[#162B44] animate-bounce z-50 whitespace-nowrap">
                    {remoteGreetingBubble}
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: "50%",
                        marginLeft: "-8px",
                        width: 0,
                        height: 0,
                        borderLeft: "8px solid transparent",
                        borderRight: "8px solid transparent",
                        borderTop: "8px solid black",
                      }}
                    />
                  </div>
                )}
                <div
                  className="w-14 h-14 border-4 border-black shadow-[4px_4px_0px_0px_black] flex items-center justify-center"
                  style={{ backgroundColor: ownerAvatarColor }}
                >
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-white" />
                    <div className="w-2 h-2 bg-white" />
                  </div>
                </div>
              </div>
              <div className="mt-2 bg-black text-white text-[8px] px-3 py-1 font-black uppercase shadow-[2px_2px_0px_0px_black]">
                {ownerName}
              </div>
            </div>
          )}

          {/* 내 캐릭터 */}
          <div
            className="absolute flex flex-col items-center z-10"
            style={
              isMine
                ? {
                    left: "50%",
                    bottom: "33.33%",
                    transform: "translateX(-50%)",
                  }
                : {
                    left: `calc(50% + ${visitorOffset.x}px)`,
                    bottom: "33.33%",
                    transform: "translateX(-50%)",
                  }
            }
          >
            <div className="relative" ref={charRef}>
              {greetingBubble && (
                <div
                  className="absolute bg-white border-2 border-black px-4 py-2 text-[10px] font-black shadow-[4px_4px_0px_0px_black] text-[#E9967A] animate-bounce z-[200] whitespace-nowrap"
                  style={{
                    bottom: "calc(100% + 10px)",
                    transform: "translateX(-50%)",
                  }}
                >
                  {greetingBubble}
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: "50%",
                      marginLeft: "-8px",
                      width: 0,
                      height: 0,
                      borderLeft: "8px solid transparent",
                      borderRight: "8px solid transparent",
                      borderTop: "8px solid black",
                    }}
                  />
                </div>
              )}
              <div
                className="w-14 h-14 border-4 border-black shadow-[4px_4px_0px_0px_black] flex items-center justify-center relative"
                style={{ backgroundColor: myAvatarColor }}
              >
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-white" />
                  <div className="w-2 h-2 bg-white animate-pulse" />
                </div>
                {(!isMine || otherUserPresent) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!showGreetingMenu && charRef.current) {
                        const r = charRef.current.getBoundingClientRect();
                        setMenuFixedPos({
                          bottom: window.innerHeight - r.top + 8,
                          left: r.left + r.width / 2,
                        });
                      }
                      setShowGreetingMenu(!showGreetingMenu);
                    }}
                    className="absolute -top-3 -right-3 w-7 h-7 bg-white border-2 border-black shadow-[2px_2px_0px_0px_black] flex items-center justify-center active:translate-x-[1px] active:translate-y-[1px] z-40"
                  >
                    <MessageCircle size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className="mt-2 bg-black text-white text-[8px] px-3 py-1 font-black uppercase shadow-[2px_2px_0px_0px_black]">
              나
            </div>
          </div>

          {/* Floor items */}
          {floorObjects.map((obj) => (
            <div
              key={obj.id}
              className="absolute transition-transform z-10 hover:scale-110 cursor-pointer"
              style={{ left: obj.posX - 24, top: obj.posY - 150 }}
              onClick={(e) => {
                e.stopPropagation();
                if (!canInteract) {
                  setShowAccessDenied(true);
                  return;
                }
                setSelectedObj(obj);
                onOpenObject(obj.id);
              }}
            >
              <div className="relative">
                {isMine && !obj.isOpened && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-[#E9967A] border-2 border-black flex items-center justify-center text-white font-black text-xs shadow-[2px_2px_0px_0px_black] animate-bounce z-20">
                    !
                  </div>
                )}
                <div
                  className={
                    obj.isOpened
                      ? "opacity-60"
                      : canInteract
                      ? "animate-pulse"
                      : "opacity-70"
                  }
                >
                  {obj.type === "GIFT" && (
                    <PixelGift size={48} skin={obj.skin} />
                  )}
                  {obj.type === "MESSAGE" && (
                    <PixelMail size={48} skin={obj.skin} />
                  )}
                  {obj.type === "HINT" && <PixelKey size={48} />}
                </div>
              </div>
            </div>
          ))}

          {!isMine && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black text-white border-2 border-white px-5 py-2.5 text-[9px] font-black shadow-[4px_4px_0px_0px_black] whitespace-nowrap uppercase">
              {canInteract
                ? "바닥을 탭해 선물을 남기세요 ✨"
                : "바닥을 탭해 이동해보세요!"}
            </div>
          )}
        </div>
      </div>

      {showGreetingMenu && (
        <>
          <div
            className="fixed inset-0 z-[280]"
            onClick={() => setShowGreetingMenu(false)}
          />
          <div
            className="fixed bg-white border-4 border-black p-2 shadow-[6px_6px_0px_0px_black] z-[290] w-40"
            style={{
              bottom: menuFixedPos.bottom,
              left: menuFixedPos.left,
              transform: "translateX(-50%)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-1">
              {GREETING_PRESETS.map((txt, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGreet(txt);
                  }}
                  className="bg-[#FAF9F6] hover:bg-[#F5E6D3] px-2 py-1.5 text-[9px] font-black border-2 border-transparent hover:border-black text-left text-slate-800 transition-all"
                >
                  {txt}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      {showAccessDenied && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowAccessDenied(false)}
        >
          <div
            className="bg-white border-4 border-black w-full max-w-xs shadow-[8px_8px_0px_0px_black] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#162B44] px-4 py-3 border-b-4 border-black">
              <p className="text-white text-[11px] font-black uppercase tracking-widest">
                접근 제한
              </p>
            </div>
            <div className="p-6 text-center">
              <p className="text-2xl mb-3">🔒</p>
              <p className="text-[13px] font-black text-black mb-1">
                마니또 · 마니띠만
              </p>
              <p className="text-[13px] font-black text-black mb-4">
                접근이 가능합니다
              </p>
              <p className="text-[10px] text-slate-400 font-bold mb-6">
                이 선물은 방 주인과 그의 마니또만 열 수 있어요
              </p>
              <button
                onClick={() => setShowAccessDenied(false)}
                className="w-full py-3 bg-[#E9967A] text-white border-2 border-black font-black text-[11px] shadow-[3px_3px_0px_0px_black] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
      {showLockerModal && (
        <PixelLockerModal
          objects={lockerObjects}
          onClose={() => setShowLockerModal(false)}
        />
      )}
      {showDropModal && (
        <PixelDropModal
          onClose={() => setShowDropModal(false)}
          onSave={(data) => {
            onDrop({
              ...data,
              posX: selectedPosition.x,
              posY: selectedPosition.y,
            });
            setShowDropModal(false);
          }}
        />
      )}
      {selectedObj && (
        <PixelViewModal
          obj={selectedObj}
          isMine={isMine}
          onClose={() => setSelectedObj(null)}
          onStoreInLocker={
            isMine
              ? () => {
                  onStoreInLocker(selectedObj.id);
                  setSelectedObj(null);
                }
              : undefined
          }
        />
      )}
    </div>
  );
};

export default RoomView;
