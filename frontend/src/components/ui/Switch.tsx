import React from "react";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const Switch = ({ checked, onChange }: SwitchProps) => (
  <div
    onClick={() => onChange(!checked)}
    className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
      checked ? "bg-blue-600" : "bg-gray-300"
    }`}
  >
    <div
      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
        checked ? "translate-x-4" : "translate-x-0"
      }`}
    />
  </div>
);

export default Switch;
