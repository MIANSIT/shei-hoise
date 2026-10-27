"use client";

import React, { useState } from "react";
import { Checkbox, InputNumber, Popover } from "antd";
import { PackagePlus } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";

/** The supplier bill that can go with a delivery: who it is for and what one unit costs. */
export interface QuickAddBill {
  supplierName: string;
  /** What one unit costs the shop (the product's cost price); null when it isn't set. */
  unitCost: number | null;
}

interface QuickAddStockProps {
  /**
   * Receives the units that arrived and, when a bill should be added to the supplier,
   * its amount (otherwise null). Resolve when the stock has been saved.
   */
  onAdd: (quantity: number, billAmount: number | null) => Promise<void>;
  disabled?: boolean;
  /** Set when the product has a supplier and the person may add supplier bills: offers "also add a bill". */
  bill?: QuickAddBill | null;
}

/**
 * "Stock arrived" in two taps: a small box asking how many units came in, which
 * adds them to what is there. The running-total box in the row still works for
 * recounts; this one is for receiving a delivery without doing the sum.
 * With a supplier on the product it also adds the bill (units × cost) so what is
 * owed stays right; the amount can be changed or the bill left out.
 */
export function QuickAddStock({ onAdd, disabled = false, bill = null }: QuickAddStockProps) {
  const t = useTranslation();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState<number | null>(null);
  const [addBill, setAddBill] = useState(true);
  // null until typed by hand; until then the amount follows quantity × cost.
  const [typedAmount, setTypedAmount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const suggested =
    bill && bill.unitCost && bill.unitCost > 0 && quantity ? Math.round(quantity * bill.unitCost * 100) / 100 : null;
  const billAmount = typedAmount ?? suggested;

  const submit = async () => {
    if (!quantity || quantity <= 0) return;
    setSaving(true);
    try {
      await onAdd(quantity, bill && addBill && billAmount && billAmount > 0 ? billAmount : null);
      setOpen(false);
      setQuantity(null);
      setTypedAmount(null);
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
        <div className="flex flex-col gap-2 w-56" onClick={(e) => e.stopPropagation()}>
          <label className="text-xs text-muted-foreground">{t.admin.shAddStockQty}</label>
          <InputNumber
            min={1}
            value={quantity}
            onChange={(v) => setQuantity(v === null ? null : Number(v))}
            onPressEnter={submit}
            autoFocus
            className="w-full"
          />
          {bill && (
            <div className="flex flex-col gap-1.5 rounded-lg border border-border p-2">
              <Checkbox checked={addBill} onChange={(e) => setAddBill(e.target.checked)}>
                <span className="text-xs">{t.admin.shAddBillCheck.replace("{supplier}", bill.supplierName)}</span>
              </Checkbox>
              {addBill && (
                <>
                  <InputNumber
                    min={0}
                    value={billAmount}
                    onChange={(v) => setTypedAmount(v === null ? null : Number(v))}
                    onPressEnter={submit}
                    placeholder={t.admin.shAddBillAmount}
                    className="w-full"
                  />
                  <span className="text-[11px] text-muted-foreground">
                    {bill.unitCost ? t.admin.shAddBillHint : t.admin.shAddBillNoCost}
                  </span>
                </>
              )}
            </div>
          )}
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
