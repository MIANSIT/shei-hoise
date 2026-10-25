"use client";

import React from "react";
import { useTranslation } from "@/lib/hook/useTranslation";
import type { StockHealth } from "@/lib/queries/stock/stockInsightTypes";

/** Colour of each health state — shared by the badge, the health card and the health page. */
export const HEALTH_TONE: Record<StockHealth, { badge: string; bar: string; text: string }> = {
  restock: {
    badge:
      "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 ring-red-200 dark:ring-red-800/50",
    bar: "bg-red-500",
    text: "text-red-600 dark:text-red-400",
  },
  dead: {
    badge:
      "bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 ring-slate-300 dark:ring-slate-600/50",
    bar: "bg-slate-500",
    text: "text-slate-600 dark:text-slate-300",
  },
  slow: {
    badge:
      "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 ring-amber-200 dark:ring-amber-800/50",
    bar: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-400",
  },
  new: {
    badge:
      "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 ring-sky-200 dark:ring-sky-800/50",
    bar: "bg-sky-500",
    text: "text-sky-700 dark:text-sky-400",
  },
  healthy: {
    badge:
      "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 ring-emerald-200 dark:ring-emerald-800/50",
    bar: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-400",
  },
};

/**
 * Translated name of a health state.
 * @returns a function from health to its label in the current language
 */
export function useHealthLabel(): (health: StockHealth) => string {
  const t = useTranslation();
  return (health) => {
    switch (health) {
      case "restock":
        return t.admin.shHealthRestock;
      case "slow":
        return t.admin.shHealthSlow;
      case "dead":
        return t.admin.shHealthDead;
      case "new":
        return t.admin.shHealthNew;
      default:
        return t.admin.shHealthHealthy;
    }
  };
}

interface StockHealthBadgeProps {
  health: StockHealth;
}

export function StockHealthBadge({ health }: StockHealthBadgeProps) {
  const label = useHealthLabel();
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium ring-1 ring-inset whitespace-nowrap ${HEALTH_TONE[health].badge}`}
    >
      {label(health)}
    </span>
  );
}
