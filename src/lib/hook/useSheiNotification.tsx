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
  const notify = (
    type: ToastType,
    content: ReactNode,
    options?: SheiNotificationOptions
  ) => {
    const bgColors: Record<ToastType, string> = {
      success: "#22c55e",
      warning: "#facc15",
      error: "#dc2626",
      info: "#2563eb",
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
      <div className="relative flex items-start gap-3 w-fit max-w-[90vw]">
        <div className="flex-shrink-0">{icons[type]}</div>
        <div className="flex-1 min-w-0 break-words text-base">{content}</div>
        <Button
          size="sm"
          variant="default"
          className="h-7 w-7 p-0 rounded-full flex items-center justify-center hover:brightness-110 transition"
          style={{ backgroundColor: closeBgColors[type] }}
          onClick={() => toast.dismiss()}
        >
          <X className="h-4 w-4 text-white" />
        </Button>
      </div>,
      {
        style: {
          backgroundColor: bgColors[type],
          color: textColors[type],
          padding: "0.6rem 0.85rem",
          borderRadius: "0.75rem",
          // removed boxShadow to remove black border
          width: "fit-content",
          minWidth: "140px",
          maxWidth: "90vw",
          wordBreak: "break-word",
          fontWeight: 500,
          fontSize: "1rem",
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
