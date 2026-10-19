"use client";

import React, { useState } from "react";
import { InputNumber, Modal, Segmented, Select, Checkbox } from "antd";
import type { MrpAdjustMode } from "@/lib/utils/mrpAdjust";

export interface ProductExportOptions {
  /** "all" = the whole store, otherwise a branch id. */
  scope: string;
  /** Signed MRP change applied to the file only; null leaves prices as they are. */
  mrp: { mode: MrpAdjustMode; value: number } | null;
  includeImages: boolean;
}

interface ExportProductsModalProps {
  open: boolean;
  exporting: boolean;
  currencySymbol: string;
  /** Branch choices; empty for stores without branches. */
  scopes: { value: string; label: string }[];
  onClose: () => void;
  onExport: (options: ProductExportOptions) => void;
}

type MrpChoice = "none" | MrpAdjustMode;
type Direction = "increase" | "decrease";

export function ExportProductsModal({
  open,
  exporting,
  currencySymbol,
  scopes,
  onClose,
  onExport,
}: ExportProductsModalProps) {
  const [scope, setScope] = useState<string | null>(null);
  const [choice, setChoice] = useState<MrpChoice>("none");
  const [direction, setDirection] = useState<Direction>("increase");
  const [amount, setAmount] = useState<number | null>(null);
  const [includeImages, setIncludeImages] = useState(true);

  const activeScope = scope ?? scopes[0]?.value ?? "all";
  const unit = choice === "percent" ? "%" : currencySymbol;
  const needsAmount = choice !== "none";
  const canExport = !exporting && (!needsAmount || (amount !== null && amount > 0));

  const handleExport = () => {
    onExport({
      scope: activeScope,
      mrp:
        choice === "none" || amount === null
          ? null
          : { mode: choice, value: direction === "increase" ? amount : -amount },
      includeImages,
    });
  };

  return (
    <Modal
      open={open}
      title={<span className="text-sm font-bold">Export products</span>}
      onOk={handleExport}
      onCancel={onClose}
      okText="Download CSV"
      okButtonProps={{ disabled: !canExport }}
      confirmLoading={exporting}
      centered
      destroyOnHidden
    >
      <div className="flex flex-col gap-4 pt-2">
        {scopes.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-foreground">Branch</span>
            <Select value={activeScope} onChange={setScope} options={scopes} />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground">MRP in the file</span>
          <Segmented
            block
            value={choice}
            onChange={(v) => setChoice(v as MrpChoice)}
            options={[
              { label: "Keep as is", value: "none" },
              { label: "By percentage (%)", value: "percent" },
              { label: `By amount (${currencySymbol})`, value: "amount" },
            ]}
          />
        </div>

        {needsAmount && (
          <>
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
              max={choice === "percent" && direction === "decrease" ? 99.99 : undefined}
              value={amount}
              onChange={setAmount}
              addonAfter={unit}
              placeholder={choice === "percent" ? "e.g. 20" : "e.g. 50"}
            />
            <p className="text-xs text-muted-foreground m-0">
              Only the downloaded file changes. Your store prices stay the same.
            </p>
          </>
        )}

        <Checkbox checked={includeImages} onChange={(e) => setIncludeImages(e.target.checked)}>
          Include product image links
        </Checkbox>
      </div>
    </Modal>
  );
}
