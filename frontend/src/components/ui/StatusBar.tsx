import React from "react";

interface StatusBarProps {
  theme?: "dark" | "light";
}

const StatusBar = ({ theme = "dark" }: StatusBarProps) => {
  return <div className="pt-1 pb-2 z-50 select-none" />;
};

export default StatusBar;
