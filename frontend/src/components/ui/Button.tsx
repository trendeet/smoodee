import React from "react";
import { LucideIcon } from "lucide-react";

interface ButtonProps {
  children?: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "outline" | "white" | "ai";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
  icon?: LucideIcon;
  loading?: boolean;
}

const Button = ({
  children,
  onClick,
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
  icon: Icon,
  loading = false,
}: ButtonProps) => {
  const baseStyle =
    "flex items-center justify-center font-medium rounded-xl transition-all active:scale-95";
  const variants: Record<string, string> = {
    primary: "bg-black text-white hover:bg-gray-800 disabled:bg-gray-300",
    secondary:
      "bg-gray-100 text-gray-900 hover:bg-gray-200 disabled:text-gray-400",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-50",
    outline: "border border-gray-200 text-gray-700 hover:bg-gray-50",
    white:
      "bg-white text-black hover:bg-gray-100 border-0 shadow-xl disabled:bg-gray-100 disabled:text-gray-400",
    ai: "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md hover:shadow-lg border-0",
  };
  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-3 text-sm",
    lg: "px-6 py-4 text-base w-full",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
      ) : (
        Icon && <Icon size={18} className="mr-2" />
      )}
      {children}
    </button>
  );
};

export default Button;
