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
    const bgColors: Record<ToastType, string> = {
      success: "#22c55e",
      warning: "#facc15",
      error: "#fef2f2",
    };

    const textColors: Record<ToastType, string> = {
      success: "white",
      warning: "black",
      error: "#b91c1c",
    };

    const closeBgColors: Record<ToastType, string> = {
      success: "#16a34a",
      warning: "#f59e0b",
      error: "#dc2626",
    };

    const icons: Record<ToastType, ReactNode> = {
      success: <CheckCircle2 className="h-5 w-5 text-white" />,
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
          <X className="h-3 w-3 text-red-600" />
        </Button>
      </div>,
      {
        style: {
          backgroundColor: bgColors[type],
          color: textColors[type],
          padding: "0.5rem 0.75rem",
          borderRadius: "0.5rem",
          boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
          width: "fit-content",
          minWidth: "100px",
          maxWidth: "90vw", // keeps it responsive
          wordBreak: "break-word",
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
