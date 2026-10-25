"use client";

import React, { useState } from "react";
import { InputNumber, Popover } from "antd";
import { PackagePlus } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";

interface QuickAddStockProps {
  /** Receives the units that arrived; resolve when the stock has been saved. */
  onAdd: (quantity: number) => Promise<void>;
  disabled?: boolean;
}

/**
 * "Stock arrived" in two taps: a small box asking how many units came in, which
 * adds them to what is there. The running-total box in the row still works for
 * recounts; this one is for receiving a delivery without doing the sum.
 */
export function QuickAddStock({ onAdd, disabled = false }: QuickAddStockProps) {
  const t = useTranslation();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!quantity || quantity <= 0) return;
    setSaving(true);
    try {
      await onAdd(quantity);
      setOpen(false);
      setQuantity(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (!disabled) setOpen(next);
      }}
      trigger="click"
      title={t.admin.shAddStockTitle}
      content={
        <div className="flex flex-col gap-2 w-52" onClick={(e) => e.stopPropagation()}>
          <label className="text-xs text-muted-foreground">{t.admin.shAddStockQty}</label>
          <InputNumber
            min={1}
            value={quantity}
            onChange={(v) => setQuantity(v === null ? null : Number(v))}
            onPressEnter={submit}
            autoFocus
            className="w-full"
          />
          <button
            type="button"
            onClick={submit}
            disabled={saving || !quantity || quantity <= 0}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {t.admin.shAddStockButton}
          </button>
        </div>
      }
    >
      <button
        type="button"
        disabled={disabled}
        aria-label={t.admin.shAddStock}
        title={disabled ? t.admin.shReadOnlyBranch : t.admin.shAddStock}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground hover:text-emerald-700 hover:border-emerald-400 disabled:opacity-40 transition-colors"
      >
        <PackagePlus size={12} aria-hidden="true" />
        {t.admin.shAddStock}
      </button>
    </Popover>
  );
}
