import React from "react";
import { Heart, Film } from "lucide-react";
import { Template } from "@/lib/mock-data/templates";

interface TemplateCardProps {
  template: Template;
  onClick: () => void;
  isScrapped?: boolean;
  onScrap?: (id: string) => void;
}

const TemplateCard = ({ template: t, onClick, isScrapped, onScrap }: TemplateCardProps) => {
  const images = [
    "1542051841857-5f90071e7989",
    "1546069901-ba9599a7e63c",
    "1515886657613-9f3515b0c78f",
    "1555529733-0e670560f7e1",
    "1469334031218-e382a71b716b",
    "1570176527506-69a478c575a7",
    "1545893835-aba7a139478e",
    "1516975080664-ed2fc6a32937",
    "1592924357228-91a4daadcfea",
  ];

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer space-y-3 active:opacity-80 transition-opacity relative text-left"
    >
      <div
        className={`aspect-[4/5] bg-gradient-to-br ${t.thumbGradient} rounded-3xl relative overflow-hidden shadow-sm ring-1 ring-black/5`}
      >
        {t.id === "t1" ? (
          <>
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0.5 opacity-80">
              {images.map((img, i) => (
                <div
                  key={i}
                  className={`bg-gray-300 bg-[url('https://images.unsplash.com/photo-${img}?w=200')] bg-cover bg-center`}
                />
              ))}
            </div>
            <div className="absolute inset-0 bg-red-600 mix-blend-multiply opacity-60" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center z-10">
              <span className="font-black text-3xl tracking-tighter drop-shadow-xl">
                COLOR
                <br />
                Grab
              </span>
            </div>
          </>
        ) : t.id === "t_day" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-2">
              <Film size={24} />
            </div>
            <span className="font-black text-xl leading-tight">
              DAY
              <br />
              SHARE
            </span>
            <span className="text-[10px] mt-2 bg-white/20 px-2 py-1 rounded-full backdrop-blur-sm">
              Group
            </span>
          </div>
        ) : (
          <>
            <div className="absolute inset-0 p-4">
              <div className="w-full h-full bg-white/40 backdrop-blur-sm rounded-xl grid grid-cols-2 gap-1 p-1 overflow-hidden group-hover:scale-105 transition-transform duration-500">
                <div className="bg-white/50 rounded-lg"></div>
                <div className="bg-white/30 rounded-lg"></div>
                <div className="bg-white/30 rounded-lg col-span-2"></div>
              </div>
            </div>
            <div className="absolute bottom-3 left-3 flex gap-1">
              <div className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg border border-white/10">
                {t.type}
              </div>
            </div>
          </>
        )}

        {(onScrap || isScrapped) && (
          <div
            className="absolute top-2 right-2 z-20"
            onClick={(e) => {
              e.stopPropagation();
              if (onScrap) onScrap(t.id);
            }}
          >
            <div
              className={`backdrop-blur-md p-1.5 rounded-full text-white transition-colors ${
                onScrap ? "bg-black/20 hover:bg-black/40" : "bg-black/40"
              }`}
            >
              <Heart
                size={12}
                fill={isScrapped ? "#ef4444" : "none"}
                className={isScrapped ? "text-red-500" : "text-white/80"}
              />
            </div>
          </div>
        )}
      </div>
      <div>
        <h3 className="font-bold text-sm text-gray-900 leading-tight mb-1">
          {t.title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[8px] font-bold text-gray-500">
              {t.author[0]}
            </div>
            <span className="font-medium">{t.author}</span>
          </div>
          <span>•</span>
          <span>{t.time}</span>
        </div>
      </div>
    </div>
  );
};

export default TemplateCard;
