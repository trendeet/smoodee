import React, { useState, useEffect } from "react";
import { ChevronLeft, Palette, Camera, Share2, MoreVertical, RefreshCcw } from "lucide-react";
import StatusBar from "@/components/ui/StatusBar";
import Button from "@/components/ui/Button";
import ColorBlockSelector from "./ColorBlockSelector";
import { randomColorPalette, ColorPalette } from "@/lib/utils/colors";

interface SessionSlot {
  type: string;
  id: number;
}

interface InitialSession {
  id?: string;
  step?: number;
  selectedColor?: ColorPalette;
  gridSize?: number;
  slots?: (SessionSlot | null)[];
}

interface SessionData {
  id: string;
  templateId: string;
  title: string;
  step: number;
  selectedColor: ColorPalette;
  gridSize: number;
  slots: (SessionSlot | null)[];
  lastModified: string;
}

interface ColorWorkFlowProps {
  onBack: () => void;
  navigateTo: (screen: string, params?: any) => void;
  initialSession?: InitialSession | null;
  onSaveSession: (sessionData: SessionData) => void;
}

const ColorWorkFlow = ({
  onBack,
  navigateTo,
  initialSession,
  onSaveSession,
}: ColorWorkFlowProps) => {
  const [mode, setMode] = useState(initialSession ? "actual" : "guide");
  const [step, setStep] = useState(initialSession?.step || 0);

  // Guide State
  const [guideFilledSlots, setGuideFilledSlots] = useState(
    Array(9).fill(false)
  );

  // Actual State
  const [colors, setColors] = useState<ColorPalette[]>([]);
  const [selectedColor, setSelectedColor] = useState<ColorPalette | null>(
    initialSession?.selectedColor || null
  );
  const [gridSize, setGridSize] = useState<number | null>(initialSession?.gridSize || null);
  const [slots, setSlots] = useState<(SessionSlot | null)[]>(initialSession?.slots || []);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setColors(randomColorPalette());
  }, []);

  const skipGuide = () => {
    setMode("actual");
    setStep(1);
  };
  const nextGuide = () => setStep((prev) => prev + 1);

  const handleRefreshColors = () => {
    setColors(randomColorPalette());
    setSelectedColor(null);
  };

  const renderOverlay = () => (
    <div className="absolute inset-0 bg-gray-900/40 z-40 pointer-events-none" />
  );
  const renderTooltip = (text: string, positionClass: string, hideArrow = false) => (
    <div className={`absolute ${positionClass} z-50 w-max max-w-[280px]`}>
      <div className="bg-white text-black px-4 py-2.5 rounded-xl font-bold text-sm shadow-xl relative text-center break-keep leading-snug whitespace-pre-wrap">
        {text}
        {!hideArrow && (
          <div className="w-3 h-3 bg-white rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
        )}
      </div>
    </div>
  );

  if (mode === "guide") {
    if (step === 0) {
      return (
        <div className="flex flex-col h-full bg-white animate-fade-in relative pb-safe items-center text-center">
          <StatusBar theme="dark" />
          <div className="absolute top-12 left-4 z-10">
            <button
              onClick={onBack}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
            >
              <ChevronLeft size={24} />
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center px-6 mt-10">
            <div className="w-20 h-20 bg-gradient-to-tr from-red-500 via-orange-500 to-yellow-500 rounded-[2rem] flex items-center justify-center mb-8 shadow-xl shadow-red-200">
              <Palette className="text-white" size={36} />
            </div>
            <h1 className="text-2xl font-black mb-4 leading-tight tracking-tight text-gray-900">
              일상적인 공간을
              <br />
              새롭게 관찰해보세요
            </h1>
            <p className="text-gray-500 font-medium text-sm mb-12 break-keep leading-relaxed px-2">
              오늘 나의 기분에 맞는{" "}
              <span className="font-bold text-gray-900">색상 하나를 선택</span>
              하고,
              <br />
              하루 동안 일상 속에서 그 색상을 찾아
              <br />
              사진으로 기록해보세요.
              <br />
              <br />
              무심코 지나쳤던 주변 환경에 대한 민감도를 높이고,
              <br />
              잠자던 시각적 감각을 일깨워줍니다.
            </p>
          </div>
          <div className="w-full p-6 pb-safe mb-4 flex flex-col gap-4 relative z-50">
            <Button size="lg" onClick={nextGuide}>
              사용법 알아보기
            </Button>
            <button
              onClick={skipGuide}
              className="text-xs font-bold text-gray-400 underline underline-offset-4 hover:text-gray-600 transition-colors"
            >
              건너뛰기
            </button>
          </div>
        </div>
      );
    }

    if (step === 1) {
      return (
        <div className="flex flex-col h-full bg-white relative pb-safe overflow-hidden animate-fade-in">
          <StatusBar theme="light" />
          {renderOverlay()}
          <div className="absolute top-12 right-6 z-50">
            <button
              onClick={skipGuide}
              className="text-xs font-bold text-white/70 hover:text-white underline underline-offset-4"
            >
              건너뛰기
            </button>
          </div>
          <div className="px-6 pt-12 pb-2 opacity-30 relative z-30">
            <h1 className="text-3xl font-black leading-tight text-gray-900 mb-2 tracking-tight">
              오늘 당신의
              <br />
              무드는 어떤가요?
            </h1>
          </div>
          <div className="flex-1 px-6 flex flex-col justify-center relative py-6">
            <div className="grid grid-cols-3 gap-4 relative">
              <div className="relative z-50 pointer-events-none">
                {renderTooltip(
                  "색상 하나를 선택해 주세요.",
                  "-top-16 absolute left-0 whitespace-nowrap"
                )}
                <ColorBlockSelector
                  color={{ name: "Ocean", bg: "bg-blue-500" }}
                  isSelected={true}
                  onClick={() => {}}
                />
              </div>
              <div className="opacity-20 pointer-events-none">
                <ColorBlockSelector
                  color={{ name: "Sunset", bg: "bg-orange-500" }}
                  isSelected={false}
                  onClick={() => {}}
                />
              </div>
              <div className="opacity-20 pointer-events-none">
                <ColorBlockSelector
                  color={{ name: "Forest", bg: "bg-emerald-500" }}
                  isSelected={false}
                  onClick={() => {}}
                />
              </div>
            </div>
          </div>
          <div className="p-6 safe-area-bottom w-full flex justify-between items-center relative z-50 mt-auto">
            <button
              onClick={() => setStep(0)}
              className="px-4 py-2 rounded-xl text-white/80 font-bold text-sm hover:bg-white/10 hover:text-white transition-colors"
            >
              이전
            </button>
            <button
              onClick={nextGuide}
              className="px-6 py-2.5 rounded-xl bg-white text-black font-bold text-sm shadow-lg hover:bg-gray-100 transition-colors"
            >
              다음
            </button>
          </div>
        </div>
      );
    }

    if (step === 2) {
      const handleGuideSlotClick = (i: number) => {
        const newSlots = [...guideFilledSlots];
        newSlots[i] = true;
        setGuideFilledSlots(newSlots);
      };
      return (
        <div className="flex flex-col h-full bg-white relative pb-safe overflow-hidden animate-fade-in">
          <StatusBar theme="light" />
          {renderOverlay()}
          <div className="absolute top-12 right-6 z-50">
            <button
              onClick={skipGuide}
              className="text-xs font-bold text-white/70 hover:text-white underline underline-offset-4"
            >
              건너뛰기
            </button>
          </div>
          <div className="px-6 pt-12 pb-2 opacity-30 relative z-30">
            <h1 className="text-3xl font-black mb-2 text-gray-900">
              몇 장의 사진을
              <br />
              담을까요?
            </h1>
          </div>
          <div className="flex-1 px-6 flex flex-col items-center justify-center relative py-6">
            <div className="relative z-50 w-full max-w-[300px] flex flex-col items-center">
              {renderTooltip(
                "선택한 색상을 가진 이미지를\n2x2 또는 3x3 을 골라 업로드 합니다.",
                "-top-20 absolute left-1/2 -translate-x-1/2 w-[260px]"
              )}
              <div className="w-full aspect-square bg-white p-2 rounded-2xl shadow-2xl grid grid-cols-3 gap-2 mt-4">
                {guideFilledSlots.map((filled, i) => (
                  <div
                    key={i}
                    onClick={() => handleGuideSlotClick(i)}
                    className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all active:scale-95 ${
                      filled ? "bg-gray-800" : "bg-gray-100 hover:bg-gray-200"
                    } flex items-center justify-center`}
                  >
                    {filled ? (
                      <img
                        src={`https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=200&sig=${i}`}
                        className="w-full h-full object-cover opacity-80"
                        alt="guide"
                      />
                    ) : (
                      <Camera className="text-gray-400" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="p-6 safe-area-bottom w-full flex justify-between items-center relative z-50 mt-auto">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-xl text-white/80 font-bold text-sm hover:bg-white/10 hover:text-white transition-colors"
            >
              이전
            </button>
            <button
              onClick={nextGuide}
              className="px-6 py-2.5 rounded-xl bg-white text-black font-bold text-sm shadow-lg hover:bg-gray-100 transition-colors"
            >
              다음
            </button>
          </div>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="flex flex-col h-full bg-blue-100 relative pb-safe overflow-hidden animate-fade-in">
          <StatusBar theme="light" />
          {renderOverlay()}
          <div className="absolute top-12 right-6 z-50">
            <button
              onClick={skipGuide}
              className="text-xs font-bold text-white/70 hover:text-white underline underline-offset-4"
            >
              건너뛰기
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center relative py-6 px-6">
            <div className="relative z-50 w-full flex flex-col items-center">
              <div className="w-full max-w-[280px] bg-white p-5 rounded-xl shadow-2xl transform scale-105 relative ring-4 ring-white/20 flex flex-col">
                <div className="w-full aspect-square grid grid-cols-3 grid-rows-3 gap-1">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="bg-gray-300 relative aspect-square">
                      <img
                        src={`https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=200&sig=${i}`}
                        className="w-full h-full object-cover"
                        alt="guide result"
                      />
                      <div className="absolute inset-0 bg-blue-500 mix-blend-color opacity-40" />
                    </div>
                  ))}
                </div>
              </div>
              {renderTooltip(
                "결과가 완성됩니다.",
                "top-full mt-12 absolute left-1/2 -translate-x-1/2 whitespace-nowrap",
                true
              )}
            </div>
          </div>
          <div className="p-6 safe-area-bottom w-full flex flex-col gap-3 relative z-50 mt-auto">
            <Button size="lg" variant="white" onClick={skipGuide}>
              이용해보기
            </Button>
            <Button size="lg" variant="white" onClick={onBack}>
              홈으로 돌아가기
            </Button>
          </div>
        </div>
      );
    }
  }

  // Actual Flow (mode === 'actual')
  const handleActualNext = () => setStep((prev) => prev + 1);

  if (step === 1) {
    return (
      <div className="flex flex-col h-full bg-white animate-fade-in relative pb-safe">
        <StatusBar theme="dark" />
        <div className="px-6 pt-12 pb-2">
          <button
            onClick={() => (initialSession ? onBack() : setMode("guide"))}
            className="mb-6 p-2 -ml-2 rounded-full hover:bg-gray-100 w-fit transition-colors"
          >
            <ChevronLeft />
          </button>
          <h1 className="text-3xl font-black leading-tight text-gray-900 mb-2 tracking-tight">
            오늘 당신의
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
              무드
            </span>
            는 어떤가요?
          </h1>
          <p className="text-gray-500 text-sm font-medium">
            가장 끌리는 색상과 팔레트를 선택해주세요.
          </p>
        </div>

        <div className="flex-1 px-6 flex flex-col justify-center py-6">
          <div className="flex justify-between items-end mb-4">
            <span className="text-xs font-bold text-gray-400">추천 팔레트</span>
            <button
              onClick={handleRefreshColors}
              className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors active:scale-95"
            >
              <RefreshCcw size={12} /> 새로고침
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {colors.map((color, i) => (
              <ColorBlockSelector
                key={i}
                color={color}
                isSelected={selectedColor?.name === color.name}
                onClick={() => setSelectedColor(color)}
              />
            ))}
          </div>
        </div>

        <div className="p-6 safe-area-bottom bg-gradient-to-t from-white via-white/80 to-transparent pt-4">
          <Button
            size="lg"
            disabled={!selectedColor}
            onClick={handleActualNext}
          >
            {selectedColor
              ? `${selectedColor.name} 무드로 시작하기`
              : "색상을 선택해주세요"}
          </Button>
        </div>
      </div>
    );
  }

  if (step === 2) {
    const handleGridSelect = (size: number) => {
      setGridSize(size);
      setSlots(Array(size).fill(null));
    };
    return (
      <div className="flex flex-col h-full bg-white animate-slide-left relative">
        <StatusBar theme="dark" />
        <div className="px-6 pt-12 pb-6">
          <button
            onClick={() => setStep(1)}
            className="mb-6 p-2 -ml-2 rounded-full hover:bg-gray-100 w-fit"
          >
            <ChevronLeft />
          </button>
          <h1 className="text-3xl font-black mb-2">
            몇 장의 사진을
            <br />
            담을까요?
          </h1>
          <p className="text-gray-500">원하는 레이아웃을 선택해주세요.</p>
        </div>
        <div className="flex-1 px-6 flex flex-col justify-center gap-6 overflow-y-auto no-scrollbar">
          <button
            onClick={() => handleGridSelect(4)}
            className={`w-full border-2 rounded-3xl p-6 flex flex-col items-center justify-center gap-4 transition-all shrink-0 ${
              gridSize === 4
                ? `border-${selectedColor?.text?.split("-")[1]}-500 bg-${
                    selectedColor?.text?.split("-")[1]
                  }-50 shadow-xl`
                : "border-gray-100 hover:border-gray-200"
            }`}
          >
            <div className="grid grid-cols-2 gap-2 w-24 h-24">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-gray-200 rounded-lg w-full h-full" />
              ))}
            </div>
            <span className="font-bold text-lg">2 x 2 (4장)</span>
          </button>
          <button
            onClick={() => handleGridSelect(9)}
            className={`w-full border-2 rounded-3xl p-6 flex flex-col items-center justify-center gap-4 transition-all shrink-0 ${
              gridSize === 9
                ? `border-${selectedColor?.text?.split("-")[1]}-500 bg-${
                    selectedColor?.text?.split("-")[1]
                  }-50 shadow-xl`
                : "border-gray-100 hover:border-gray-200"
            }`}
          >
            <div className="grid grid-cols-3 gap-2 w-24 h-24">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                <div key={i} className="bg-gray-200 rounded-md w-full h-full" />
              ))}
            </div>
            <span className="font-bold text-lg">3 x 3 (9장)</span>
          </button>
        </div>
        <div className="p-6 pb-safe safe-area-bottom bg-white">
          <Button size="lg" disabled={!gridSize} onClick={handleActualNext}>
            시작하기
          </Button>
        </div>
      </div>
    );
  }

  if (step === 3) {
    const handleSlotClick = (index: number) => {
      if (isProcessing) return;
      setIsProcessing(true);
      setTimeout(() => {
        const newSlots = [...slots];
        newSlots[index] = { type: "image", id: Date.now() };
        setSlots(newSlots);
        setIsProcessing(false);
      }, 600);
    };

    const handleSaveAndExit = () => {
      const sessionData: SessionData = {
        id: initialSession?.id || `ip_${Date.now()}`,
        templateId: "t1",
        title: "ColorGrab",
        step,
        selectedColor: selectedColor!,
        gridSize: gridSize!,
        slots,
        lastModified: "방금 전",
      };
      onSaveSession(sessionData);
      onBack();
    };

    const getRandomImage = (index: number) => {
      const images = [
        "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=400",
        "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=400",
        "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400",
        "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400",
        "https://images.unsplash.com/photo-1555529733-0e670560f7e1?w=400",
        "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400",
        "https://images.unsplash.com/photo-1570176527506-69a478c575a7?w=400",
        "https://images.unsplash.com/photo-1545893835-aba7a139478e?w=400",
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",
      ];
      return images[
        (index + (selectedColor?.name.length || 0)) % images.length
      ];
    };

    const filledCount = slots.filter(Boolean).length;

    return (
      <div className="flex flex-col h-full bg-white animate-slide-left relative">
        <StatusBar theme="dark" />
        <div className="px-4 py-3 flex justify-between items-center border-b border-gray-100">
          <button
            onClick={() => setStep(2)}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100"
          >
            <ChevronLeft />
          </button>
          <span className="font-bold">
            {filledCount} / {gridSize} 채움
          </span>
          <button
            onClick={handleSaveAndExit}
            className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
          >
            임시저장
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50 overflow-y-auto">
          <div
            className={`w-full aspect-square grid gap-2 p-2 rounded-2xl shadow-2xl bg-white ${
              gridSize === 4 ? "grid-cols-2" : "grid-cols-3"
            }`}
          >
            {slots.map((slot, i) => (
              <div
                key={i}
                onClick={() => handleSlotClick(i)}
                className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all active:scale-95 ${
                  slot ? "bg-gray-800" : "bg-gray-100 hover:bg-gray-200"
                } flex items-center justify-center`}
              >
                {slot ? (
                  <>
                    <img
                      src={getRandomImage(i)}
                      alt="slot"
                      className="w-full h-full object-cover opacity-60"
                    />
                    <div
                      className={`absolute inset-0 ${selectedColor?.bg} mix-blend-color opacity-30`}
                    />
                  </>
                ) : (
                  <Camera className="text-gray-400" />
                )}
                {isProcessing && !slot && (
                  <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-gray-500">
            각 프레임을 눌러 사진을 채워주세요!
          </p>
        </div>
        <div className="p-6 pb-safe safe-area-bottom bg-white border-t border-gray-100">
          <Button
            size="lg"
            disabled={filledCount < (gridSize || 0)}
            onClick={handleActualNext}
          >
            완성하기
          </Button>
        </div>
      </div>
    );
  }

  if (step === 4) {
    const getRandomImage = (index: number) => {
      const images = [
        "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=400",
        "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=400",
        "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400",
        "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400",
        "https://images.unsplash.com/photo-1555529733-0e670560f7e1?w=400",
        "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400",
        "https://images.unsplash.com/photo-1570176527506-69a478c575a7?w=400",
        "https://images.unsplash.com/photo-1545893835-aba7a139478e?w=400",
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",
      ];
      return images[
        (index + (selectedColor?.name.length || 0)) % images.length
      ];
    };

    return (
      <div
        className={`flex flex-col h-full ${selectedColor?.bg} text-white animate-fade-in relative`}
      >
        <StatusBar theme="light" />
        <div className="px-4 py-3 flex justify-between items-center relative z-50">
          <button
            onClick={() => setStep(3)}
            className="p-2 -ml-2 rounded-full hover:bg-white/20 transition-colors"
          >
            <ChevronLeft />
          </button>
          <span className="font-bold text-lg">ColorWork</span>
          <div className="relative">
            <button className="p-2 rounded-full hover:bg-white/20 transition-colors">
              <MoreVertical size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto no-scrollbar">
          <div className="bg-white p-3 rounded-xl shadow-2xl mb-6 transform hover:scale-[1.02] transition-transform duration-500 w-full max-w-[320px] aspect-square flex flex-col relative overflow-hidden ring-4 ring-white/20">
            <div
              className={`w-full h-full grid gap-1 overflow-hidden ${
                gridSize === 4
                  ? "grid-cols-2 grid-rows-2"
                  : "grid-cols-3 grid-rows-3"
              }`}
            >
              {slots.map((_, i) => (
                <div
                  key={i}
                  className="relative w-full h-full bg-gray-200 overflow-hidden"
                >
                  <img
                    src={getRandomImage(i)}
                    alt="filled slot"
                    className="w-full h-full object-cover"
                  />
                  <div
                    className={`absolute inset-0 ${selectedColor?.bg} mix-blend-color opacity-30`}
                  />
                  <div
                    className={`absolute inset-0 ${selectedColor?.bg} mix-blend-multiply opacity-10`}
                  />
                </div>
              ))}
            </div>
          </div>
          <p className="text-white/80 text-sm font-medium text-center drop-shadow-md">
            #ColorWork #{selectedColor?.name} #{gridSize}cuts
          </p>
        </div>

        <div className="p-6 pb-safe safe-area-bottom space-y-3 bg-gradient-to-t from-black/20 to-transparent">
          <Button size="lg" variant="white" icon={Share2}>
            공유하기
          </Button>
          <button
            onClick={onBack}
            className="w-full py-3 text-white text-sm font-bold opacity-80 hover:opacity-100"
          >
            홈으로
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default ColorWorkFlow;
