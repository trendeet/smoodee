import React from "react";
import { AlertCircle, Check } from "lucide-react";

interface ToastProps {
  message: string;
  type?: "success" | "error";
  onClose?: () => void;
}

const Toast = ({ message, type = "success", onClose }: ToastProps) => (
  <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-gray-900/90 backdrop-blur text-white px-4 py-2.5 rounded-full text-sm shadow-xl animate-fade-in-down flex items-center gap-2 whitespace-nowrap">
    <div
      className={`${
        type === "error" ? "bg-red-500" : "bg-green-500"
      } rounded-full p-0.5`}
    >
      {type === "error" ? (
        <AlertCircle size={10} className="text-white" />
      ) : (
        <Check size={10} className="text-white" />
      )}
    </div>
    {message}
  </div>
);

export default Toast;
