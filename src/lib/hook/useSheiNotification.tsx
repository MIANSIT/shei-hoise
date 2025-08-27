"use client";

import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, XCircle, X } from "lucide-react";
import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type ToastType = "success" | "warning" | "error";

type SheiNotificationOptions = {
  duration?: number;
  content?: ReactNode; // Flexible JSX content
};

export function useSheiNotification() {
  const notify = (
    type: ToastType,
    content: ReactNode,
    options?: SheiNotificationOptions
  ) => {
    // ✅ Modern background colors
    const bgColors: Record<ToastType, string> = {
      success: "#22c55e", // Tailwind emerald-500
      warning: "#facc15", // Tailwind yellow-400
      error: "#fef2f2", // subtle red-50
    };

    // ✅ Modern text colors for contrast
    const textColors: Record<ToastType, string> = {
      success: "#f9fafb", // gray-50 (softer than pure white)
      warning: "#1f2937", // gray-800 for readability
      error: "#b91c1c", // red-700
    };

    // ✅ Close button background colors
    const closeBgColors: Record<ToastType, string> = {
      success: "#16a34a", // emerald-600
      warning: "#eab308", // yellow-500
      error: "#dc2626", // red-600
    };

    const icons: Record<ToastType, ReactNode> = {
      success: <CheckCircle2 className="h-5 w-5 text-emerald-100" />,
      warning: <AlertTriangle className="h-5 w-5 text-yellow-700" />,
      error: <XCircle className="h-5 w-5 text-red-600" />,
    };

    toast(
      <div className="relative flex items-start gap-2 w-fit max-w-[90vw]">
        {/* Icon */}
        <div className="flex-shrink-0">{icons[type]}</div>

        {/* Flexible Content */}
        <div className="flex-1 min-w-0 break-words">{content}</div>

        {/* Close Button */}
        <Button
          size="sm"
          variant="default"
          className={`
            h-6 w-6 p-0 rounded-full shadow-md flex items-center justify-center
            hover:brightness-110 transition ml-3
          `}
          style={{ backgroundColor: closeBgColors[type] }}
          onClick={() => toast.dismiss()}
        >
          <X className="h-3 w-3 text-white" />
        </Button>
      </div>,
      {
        style: {
          backgroundColor: bgColors[type],
          color: textColors[type],
          padding: "0.5rem 0.75rem",
          borderRadius: "0.75rem", // ✅ more modern rounded corners
          boxShadow: "0 6px 14px rgba(0,0,0,0.15)", // ✅ softer, modern shadow
          width: "fit-content",
          minWidth: "120px",
          maxWidth: "90vw", // keeps it responsive
          wordBreak: "break-word",
          fontWeight: 500, // ✅ modern semi-bold text
        },
        duration: options?.duration ?? 4000,
      }
    );
  };

  return {
    success: (content: ReactNode, options?: SheiNotificationOptions) =>
      notify("success", content, options),
    warning: (content: ReactNode, options?: SheiNotificationOptions) =>
      notify("warning", content, options),
    error: (content: ReactNode, options?: SheiNotificationOptions) =>
      notify("error", content, options),
  };
}
