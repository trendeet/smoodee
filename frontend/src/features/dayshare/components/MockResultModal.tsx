import React, { useState, useEffect } from "react";
import { X, Camera } from "lucide-react";

interface ModalSlot {
  id: string;
  label: string;
  status: string;
  name?: string;
  time?: string;
}

interface MockResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberCount: number;
  slots: ModalSlot[];
}

const MockResultModal = ({ isOpen, onClose, memberCount, slots }: MockResultModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % slots.length);
    }, 2500);
    return () => clearInterval(timer);
  }, [isOpen, slots.length]);

  if (!isOpen) return null;

  const currentSlot = slots[currentStep];
  const currentSlotName =
    currentSlot.name !== undefined
      ? currentSlot.name
      : currentSlot.label.replace(/^[0-9]{2}:[0-9]{2} /, "");
  const currentSlotTime = currentSlot.time || currentSlot.label.split(" ")[0];

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col animate-fade-in">
      <div className="absolute top-0 left-0 right-0 p-4 z-50 flex justify-between items-start bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex flex-col">
          <span className="text-white font-black text-xl italic tracking-tighter">
            DAY SHARE
          </span>
          <span className="text-white/80 text-xs font-medium">
            with {memberCount - 1} friends
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 flex flex-col w-full h-full relative">
        {[...Array(memberCount)].map((_, memberIndex) => (
          <React.Fragment key={memberIndex}>
          <div
            className="flex-1 w-full relative overflow-hidden bg-gray-900"
          >
            <div
              className="absolute inset-0 w-full h-full bg-cover bg-center transition-all duration-700 ease-in-out transform"
              style={{
                backgroundImage:
                  memberIndex === 0 && currentSlot.status === "filled"
                    ? `url('https://source.unsplash.com/random/400x300?sig=${currentSlot.id}')`
                    : `url('https://source.unsplash.com/random/400x300?sig=${
                        100 + memberIndex + currentStep
                      }')`,
                opacity:
                  memberIndex === 0 && currentSlot.status !== "filled"
                    ? 0.3
                    : 1,
                scale: "1.05",
              }}
            />

            {memberIndex === 0 && currentSlot.status !== "filled" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10">
                <div className="w-10 h-10 rounded-full border-2 border-dashed border-white/50 flex items-center justify-center mb-2">
                  <Camera className="text-white/50" size={20} />
                </div>
                <span className="text-white/50 text-xs font-medium">
                  기록 없음
                </span>
              </div>
            )}

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <span className="text-white font-black text-3xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-center px-4 leading-tight tracking-tight">
                {currentSlotName}
              </span>
            </div>

            <div className="absolute bottom-3 left-4 z-20">
              <div className="bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] text-white font-bold border border-white/10 shadow-lg">
                {memberIndex === 0 ? "나" : `Friend ${memberIndex}`}
              </div>
            </div>
          </div>
          {memberIndex < memberCount - 1 && (
            <div className="relative z-30 flex items-center justify-center h-0">
              <div className="bg-black/60 backdrop-blur-md px-4 py-1 rounded-full border border-white/20 shadow-lg">
                <span className="text-white font-bold text-sm tracking-wide">
                  {currentSlotTime}
                </span>
              </div>
            </div>
          )}
          </React.Fragment>
        ))}
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800 z-50">
        <div
          className="h-full bg-white transition-all duration-[2500ms] linear"
          style={{ width: `${((currentStep + 1) / slots.length) * 100}%` }}
        />
      </div>
    </div>
  );
};

export default MockResultModal;
