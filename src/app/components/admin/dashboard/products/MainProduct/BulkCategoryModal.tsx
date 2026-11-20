"use client";

import React, { useEffect, useState } from "react";
import { Modal, Segmented, Select } from "antd";
import {
  bulkAddCategory,
  listBulkCategoryOptions,
  type BulkCategoryMode,
  type BulkCategoryOption,
} from "@/lib/queries/products/bulkAddCategory";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";

interface BulkCategoryModalProps {
  open: boolean;
  productIds: string[];
  onClose: () => void;
  /** Called after the category was added, so the list can be refetched. */
  onDone: () => void;
}

export function BulkCategoryModal({ open, productIds, onClose, onDone }: BulkCategoryModalProps) {
  const notif = useSheiNotification();
  const [options, setOptions] = useState<BulkCategoryOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<BulkCategoryMode>("add");

  const count = productIds.length;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingOptions(true);
    listBulkCategoryOptions()
      .then((list) => {
        if (!cancelled) setOptions(list);
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingOptions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleSave = async () => {
    if (!categoryId) return;
    setSaving(true);
    try {
      const result = await bulkAddCategory({ productIds, categoryId, mode });
      if (!result.success) {
        notif.error(result.error ?? "Could not add the category.");
        return;
      }
      const note = result.alreadyIn > 0 ? ` ${result.alreadyIn} already ${mode === "add" ? "had it" : "only in it"}.` : "";
      notif.success(
        `Category ${mode === "add" ? "added to" : "set on"} ${result.updated} product${result.updated !== 1 ? "s" : ""}.${note}`,
      );
      setCategoryId(null);
      onDone();
      onClose();
    } catch (err) {
      notif.error(err instanceof Error ? err.message : "Could not add the category.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={<span className="text-sm font-bold">Add category</span>}
      onOk={handleSave}
      onCancel={onClose}
      okText={mode === "add" ? "Add category" : "Replace category"}
      okButtonProps={{ disabled: !categoryId, danger: mode === "replace" }}
      confirmLoading={saving}
      centered
      destroyOnHidden
    >
      <div className="flex flex-col gap-4 pt-2">
        <p className="text-xs text-muted-foreground m-0">
          Applies to {count} selected product{count !== 1 ? "s" : ""}.{" "}
          {mode === "add"
            ? "Their current categories stay as they are."
            : "Their current categories are removed and replaced by this one."}
        </p>
        <Segmented
          block
          value={mode}
          onChange={(v) => setMode(v as BulkCategoryMode)}
          options={[
            { label: "Add to existing", value: "add" },
            { label: "Replace existing", value: "replace" },
          ]}
        />
        <Select
          size="large"
          showSearch
          optionFilterProp="label"
          placeholder="Choose a category"
          loading={loadingOptions}
          value={categoryId}
          onChange={setCategoryId}
          options={options.map((c) => ({ value: c.id, label: c.name }))}
        />
      </div>
    </Modal>
  );
}
