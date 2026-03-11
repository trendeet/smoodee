import React from "react";

interface ColorBlock {
  name: string;
  bg?: string;
  hex?: string;
}

interface ColorBlockSelectorProps {
  color: ColorBlock;
  isSelected: boolean;
  onClick: () => void;
}

const ColorBlockSelector = ({ color, isSelected, onClick }: ColorBlockSelectorProps) => (
  <div
    onClick={onClick}
    className={`relative flex flex-col cursor-pointer bg-white transition-all duration-300 p-2.5
        ${
          isSelected
            ? "scale-110 shadow-xl border border-gray-300 z-10"
            : "shadow-sm border border-gray-100 hover:shadow-md z-0"
        }`}
  >
    <div
      className={`w-full aspect-square ${color.hex ? "" : color.bg}`}
      style={color.hex ? { backgroundColor: color.hex } : undefined}
    />
    <div className="pt-2 pb-0.5 flex justify-center items-center text-center">
      <span
        className={`text-[10px] font-black tracking-widest uppercase transition-colors ${
          isSelected ? "text-gray-900" : "text-gray-400"
        }`}
      >
        {color.name}
      </span>
    </div>
  </div>
);

export default ColorBlockSelector;
