// hooks/use-notification.ts
"use client"

import { toast } from "sonner"
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react"
import { createElement, ReactNode } from "react"

type SheiNotificationOptions = Omit<Parameters<typeof toast>[1], "icon">

export function useSheiNotification() {
  const success = (message: string, options?: SheiNotificationOptions) =>
    toast.success(message, {
      icon: createElement(CheckCircle2, {
        className: "h-5 w-5 text-green-500",
      }) as ReactNode,
      ...options,
    })

  const warning = (message: string, options?: SheiNotificationOptions) =>
    toast.warning(message, {
      icon: createElement(AlertTriangle, {
        className: "h-5 w-5 text-yellow-500",
      }) as ReactNode,
      ...options,
    })

  const error = (message: string, options?: SheiNotificationOptions) =>
    toast.error(message, {
      icon: createElement(XCircle, {
        className: "h-5 w-5 text-red-500",
      }) as ReactNode,
      ...options,
    })

  return { success, warning, error }
}