// useSheiNotification.tsx
"use client";

import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { ReactNode } from "react";

type ToastType = "success" | "warning" | "error";

type SheiNotificationOptions = {
  duration?: number;
};

export function useSheiNotification() {
  const notify = (type: ToastType, message: string, options?: SheiNotificationOptions) => {
    const bgColors: Record<ToastType, string> = {
      success: "#22c55e",
      warning: "#facc15",
      error: "#ef4444",
    };

    const textColors: Record<ToastType, string> = {
      success: "white",
      warning: "black",
      error: "white",
    };

    const icons: Record<ToastType, ReactNode> = {
      success: <CheckCircle2 className="h-5 w-5" />,
      warning: <AlertTriangle className="h-5 w-5" />,
      error: <XCircle className="h-5 w-5" />,
    };

    toast(message, {
      icon: icons[type],
      style: {
        backgroundColor: bgColors[type],
        color: textColors[type],
        padding: "0.5rem 1rem",
        borderRadius: "0.375rem",
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
      },
      duration: options?.duration,
    });
  };

  return {
    success: (msg: string, options?: SheiNotificationOptions) => notify("success", msg, options),
    warning: (msg: string, options?: SheiNotificationOptions) => notify("warning", msg, options),
    error: (msg: string, options?: SheiNotificationOptions) => notify("error", msg, options),
  };
}
