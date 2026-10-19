"use client";

import React, { useState } from "react";
import { InputNumber, Modal, Segmented } from "antd";
import { bulkUpdateMrp, type BulkMrpMode } from "@/lib/queries/products/bulkUpdateMrp";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";

type Direction = "increase" | "decrease";

interface BulkMrpModalProps {
  open: boolean;
  productIds: string[];
  currencySymbol: string;
  onClose: () => void;
  /** Called after prices were saved, so the list can be refetched. */
  onDone: () => void;
}

export function BulkMrpModal({ open, productIds, currencySymbol, onClose, onDone }: BulkMrpModalProps) {
  const notif = useSheiNotification();
  const [mode, setMode] = useState<BulkMrpMode>("percent");
  const [direction, setDirection] = useState<Direction>("increase");
  const [amount, setAmount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const count = productIds.length;
  const unit = mode === "percent" ? "%" : currencySymbol;
  const canSave = amount !== null && amount > 0 && !saving;

  const handleSave = async () => {
    if (amount === null || amount <= 0) return;
    setSaving(true);
    try {
      const result = await bulkUpdateMrp({
        productIds,
        mode,
        value: direction === "increase" ? amount : -amount,
      });
      if (!result.success) {
        notif.error(result.error ?? "Could not update prices.");
        return;
      }
      const skippedNote = result.skipped > 0 ? ` ${result.skipped} skipped (price would drop to zero).` : "";
      notif.success(`MRP updated for ${result.updated} product${result.updated !== 1 ? "s" : ""}.${skippedNote}`);
      setAmount(null);
      onDone();
      onClose();
    } catch (err) {
      notif.error(err instanceof Error ? err.message : "Could not update prices.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={<span className="text-sm font-bold">Change MRP</span>}
      onOk={handleSave}
      onCancel={onClose}
      okText="Update MRP"
      okButtonProps={{ disabled: !canSave }}
      confirmLoading={saving}
      centered
      destroyOnHidden
    >
      <div className="flex flex-col gap-4 pt-2">
        <p className="text-xs text-muted-foreground m-0">
          Applies to {count} selected product{count !== 1 ? "s" : ""}, including all their variants. A discount keeps
          its amount, so the selling price moves with the MRP.
        </p>
        <Segmented
          block
          value={mode}
          onChange={(v) => setMode(v as BulkMrpMode)}
          options={[
            { label: "By percentage (%)", value: "percent" },
            { label: `By amount (${currencySymbol})`, value: "amount" },
          ]}
        />
        <Segmented
          block
          value={direction}
          onChange={(v) => setDirection(v as Direction)}
          options={[
            { label: "Increase", value: "increase" },
            { label: "Decrease", value: "decrease" },
          ]}
        />
        <InputNumber
          className="w-full"
          size="large"
          min={0}
          max={mode === "percent" && direction === "decrease" ? 99.99 : undefined}
          value={amount}
          onChange={setAmount}
          addonAfter={unit}
          placeholder={mode === "percent" ? "e.g. 10" : "e.g. 50"}
        />
        {amount !== null && amount > 0 && (
          <p className="text-xs font-medium text-foreground m-0">
            MRP will {direction === "increase" ? "go up" : "go down"} by {amount}
            {unit} on every selected product.
          </p>
        )}
      </div>
    </Modal>
  );
}
