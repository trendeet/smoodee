import React from "react";

interface HUDButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactElement;
  label: string;
  color: string;
  large?: boolean;
}

const HUDButton = ({ active, onClick, icon, label, color, large = false }: HUDButtonProps) => (
  <button
    onClick={onClick}
    className="group flex items-center gap-3 transition-all active:translate-x-[2px] active:translate-y-[2px]"
  >
    <span
      className={`px-2 py-1 bg-black text-white text-[9px] font-black border-2 border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] transition-opacity ${
        active ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      }`}
    >
      {label}
    </span>
    <div
      className={`border-4 border-black flex items-center justify-center transition-all ${
        large ? "w-16 h-16" : "w-14 h-14"
      } shadow-[4px_4px_0px_0px_black] group-active:shadow-none`}
      style={{
        backgroundColor: active ? color : "white",
        color: active ? "white" : color,
      }}
    >
      {React.cloneElement(icon, { size: large ? 30 : 24 } as React.HTMLAttributes<SVGElement>)}
    </div>
  </button>
);

export default HUDButton;
