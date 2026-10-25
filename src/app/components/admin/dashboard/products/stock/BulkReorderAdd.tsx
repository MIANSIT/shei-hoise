"use client";

import React from "react";
import { ClipboardList } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";

interface BulkReorderAddProps {
  /** Items (products, or variants) the ticked rows make up. */
  selectedCount: number;
  onAdd: () => void;
}

/** Shown while products are ticked on the Stock List: put them all on the reorder list in one tap. */
export function BulkReorderAdd({ selectedCount, onAdd }: BulkReorderAddProps) {
  const t = useTranslation();
  if (selectedCount === 0) return null;
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40">
      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600 text-white text-xs font-bold shadow-sm">
        {selectedCount}
      </div>
      <span className="text-sm font-medium text-indigo-800 dark:text-indigo-300">{t.admin.roAddToList}</span>
      <button
        type="button"
        onClick={onAdd}
        className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
      >
        <ClipboardList size={14} aria-hidden="true" />
        {t.admin.roAddToListButton}
      </button>
    </div>
  );
}
