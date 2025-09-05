"use client";

import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, XCircle, X } from "lucide-react";
import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type ToastType = "success" | "warning" | "error" | "info";

type SheiNotificationOptions = {
  duration?: number;
  content?: ReactNode;
};

export function useSheiNotification() {
  const notify = (type: ToastType, content: ReactNode, options?: SheiNotificationOptions) => {
    const bgColors: Record<ToastType, string> = {
      success: "#22c55e", // green
      warning: "#facc15", // yellow
      error: "#dc2626", // red
      info: "#2563eb",    // blue
    };
    const textColors: Record<ToastType, string> = {
      success: "#f9fafb",
      warning: "#1f2937",
      error: "#fef2f2",
      info: "#f9fafb",
    };
    const closeBgColors: Record<ToastType, string> = {
      success: "#16a34a",
      warning: "#eab308",
      error: "#b91c1c",
      info: "#1d4ed8",
    };
    const icons: Record<ToastType, ReactNode> = {
      success: <CheckCircle2 className="h-5 w-5 text-emerald-100" />,
      warning: <AlertTriangle className="h-5 w-5 text-yellow-700" />,
      error: <XCircle className="h-5 w-5 text-white" />,
      info: <CheckCircle2 className="h-5 w-5 text-blue-200" />,
    };

    toast(
      <div className="relative flex items-start gap-2 w-fit max-w-[90vw]">
        <div className="flex-shrink-0">{icons[type]}</div>
        <div className="flex-1 min-w-0 break-words">{content}</div>
        <Button
          size="sm"
          variant="default"
          className="h-6 w-6 p-0 rounded-full shadow-md flex items-center justify-center hover:brightness-110 transition ml-3"
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
          borderRadius: "0.75rem",
          boxShadow: "0 6px 14px rgba(0,0,0,0.15)",
          width: "fit-content",
          minWidth: "120px",
          maxWidth: "90vw",
          wordBreak: "break-word",
          fontWeight: 500,
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
    info: (content: ReactNode, options?: SheiNotificationOptions) =>
      notify("info", content, options),
  };
}
