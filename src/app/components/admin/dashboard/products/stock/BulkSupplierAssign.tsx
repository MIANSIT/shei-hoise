"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Select } from "antd";
import { Truck } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";
import type { Supplier } from "@/lib/queries/supplier/supplierTypes";

interface BulkSupplierAssignProps {
  /** Products the ticked rows belong to. */
  selectedCount: number;
  suppliers: readonly Supplier[];
  /** Sets the supplier on every selected product; null removes it. */
  onAssign: (supplierId: string | null) => Promise<void>;
  loading?: boolean;
}

/** Sentinel for "remove the supplier" in the dropdown (a real id is a UUID). */
const NONE = "__none__";

/**
 * Shown while products are ticked on the Stock List: pick a supplier and give
 * it to all of them in one go, instead of editing products one by one.
 */
export function BulkSupplierAssign({ selectedCount, suppliers, onAssign, loading = false }: BulkSupplierAssignProps) {
  const t = useTranslation();
  const [choice, setChoice] = useState<string | undefined>(undefined);

  if (selectedCount === 0) return null;

  const apply = async () => {
    if (!choice) return;
    await onAssign(choice === NONE ? null : choice);
    setChoice(undefined);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40">
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-600 text-white text-xs font-bold shadow-sm">
          {selectedCount}
        </div>
        <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300 whitespace-nowrap">
          <Truck size={14} className="inline mr-1 -mt-0.5" aria-hidden="true" />
          {t.admin.spAssignTo}
        </span>
      </div>

      {suppliers.length === 0 ? (
        <Link
          href="/dashboard/stock/suppliers"
          className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 hover:underline"
        >
          {t.admin.spAddFirst}
        </Link>
      ) : (
        <>
          <Select
            value={choice}
            onChange={setChoice}
            placeholder={t.admin.spAssignPlaceholder}
            disabled={loading}
            className="w-full sm:w-64"
            options={[
              ...suppliers.map((s) => ({ value: s.id, label: s.name })),
              { value: NONE, label: t.admin.spNoSupplier },
            ]}
          />
          <button
            type="button"
            onClick={apply}
            disabled={!choice || loading}
            className="sm:ml-auto inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t.admin.spAssignApply}
          </button>
        </>
      )}
    </div>
  );
}
