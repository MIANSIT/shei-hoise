"use client";

import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, XCircle, X, Info } from "lucide-react";
import { ReactNode, useCallback } from "react";
import { Button } from "@/components/ui/button";

type ToastType = "success" | "warning" | "error" | "info";

type SheiNotificationOptions = {
  duration?: number;
  content?: ReactNode;
};

export function useSheiNotification() {
  const notify = useCallback(
    (
      type: ToastType,
      content: ReactNode,
      options?: SheiNotificationOptions
    ) => {
      const bgColors: Record<ToastType, string> = {
        success: "#dcfce7", // bg-green-100 equivalent
        warning: "#fef9c3", // bg-yellow-100 equivalent
        error: "#fee2e2",   // bg-red-100 equivalent
        info: "#dbeafe",    // bg-blue-100 equivalent
      };
      
      const textColors: Record<ToastType, string> = {
        success: "#166534", // text-green-800 equivalent
        warning: "#854d0e", // text-yellow-800 equivalent
        error: "#991b1b",   // text-red-800 equivalent
        info: "#1e40af",    // text-blue-800 equivalent
      };
      
      const iconColors: Record<ToastType, string> = {
        success: "#16a34a", // text-green-600 equivalent
        warning: "#ca8a04", // text-yellow-600 equivalent
        error: "#dc2626",   // text-red-600 equivalent
        info: "#2563eb",    // text-blue-600 equivalent
      };
      
      const closeBgColors: Record<ToastType, string> = {
        success: "#bbf7d0", // hover:bg-green-200 equivalent
        warning: "#fef08a", // hover:bg-yellow-200 equivalent
        error: "#fecaca",   // hover:bg-red-200 equivalent
        info: "#bfdbfe",    // hover:bg-blue-200 equivalent
      };

      const icons: Record<ToastType, ReactNode> = {
        success: <CheckCircle2 className="h-5 w-5" style={{ color: iconColors[type] }} />,
        warning: <AlertTriangle className="h-5 w-5" style={{ color: iconColors[type] }} />,
        error: <XCircle className="h-5 w-5" style={{ color: iconColors[type] }} />,
        info: <Info className="h-5 w-5" style={{ color: iconColors[type] }} />,
      };

      // ✅ Force mobile positioning with custom styles
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      
      toast(
        <div className="relative flex items-start gap-3 w-full max-w-[90vw]">
          <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
          <div className="flex-1 min-w-0 break-words text-sm font-medium" style={{ color: textColors[type] }}>
            {content}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 rounded-full flex items-center justify-center hover:scale-105 transition-all"
            style={{ 
              backgroundColor: 'transparent',
              color: textColors[type]
            }}
            onClick={() => toast.dismiss()}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>,
        {
          style: {
            backgroundColor: bgColors[type],
            padding: "0.75rem 1rem",
            borderRadius: "0.5rem",
            width: "fit-content",
            minWidth: "200px",
            maxWidth: isMobile ? "calc(100vw - 2rem)" : "90vw", // ✅ Better mobile width
            wordBreak: "break-word",
            border: `1px solid ${iconColors[type]}20`,
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            // ✅ Force right positioning for mobile
            ...(isMobile && {
              right: "1rem",
              left: "auto",
              transform: "none",
            })
          },
          duration: options?.duration ?? 4000,
          position: "top-right",
          // ✅ Additional mobile positioning
          className: isMobile ? "!right-12 !left-auto !transform-none" : "",
        }
      );
    },
    []
  );

  const success = useCallback(
    (content: ReactNode, options?: SheiNotificationOptions) =>
      notify("success", content, options),
    [notify]
  );
  const error = useCallback(
    (content: ReactNode, options?: SheiNotificationOptions) =>
      notify("error", content, options),
    [notify]
  );
  const warning = useCallback(
    (content: ReactNode, options?: SheiNotificationOptions) =>
      notify("warning", content, options),
    [notify]
  );
  const info = useCallback(
    (content: ReactNode, options?: SheiNotificationOptions) =>
      notify("info", content, options),
    [notify]
  );

  return { success, error, warning, info };
}