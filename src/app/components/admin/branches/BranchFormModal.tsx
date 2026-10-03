"use client";

import { useEffect, useState } from "react";
import { Input, Modal } from "antd";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { saveBranch } from "@/lib/queries/branches/manageBranches";
import type { BranchItem } from "@/lib/queries/branches/types";

interface BranchFormModalProps {
  open: boolean;
  /** null = add a new branch */
  branch: BranchItem | null;
  onClose: () => void;
  onSaved: () => void;
}

export function BranchFormModal({ open, branch, onClose, onSaved }: BranchFormModalProps) {
  const t = useTranslation();
  const notify = useSheiNotification();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(branch?.name ?? "");
    setCode(branch?.code ?? "");
    setAddress(branch?.address ?? "");
    setPhone(branch?.phone ?? "");
    setNameError(null);
  }, [open, branch]);

  const handleSave = async () => {
    if (!name.trim()) {
      setNameError(t.branches.validationName);
      return;
    }
    setSaving(true);
    const result = await saveBranch({ id: branch?.id ?? null, name, code, address, phone });
    setSaving(false);
    if (!result.ok) {
      notify.error(result.error);
      return;
    }
    notify.success(t.branches.toastSaved);
    onSaved();
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      confirmLoading={saving}
      okText={t.branches.save}
      cancelText={t.branches.cancel}
      title={branch ? t.branches.editTitle : t.branches.addTitle}
      destroyOnHidden
    >
      <div className="space-y-4">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-foreground">{t.branches.fieldName}</span>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError(null);
            }}
            placeholder={t.branches.fieldNamePlaceholder}
            maxLength={60}
            status={nameError ? "error" : undefined}
            autoFocus
          />
          {nameError && <span className="block text-xs text-red-500">{nameError}</span>}
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-foreground">{t.branches.fieldCode}</span>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="DHK-02" maxLength={20} />
          <span className="block text-xs text-muted-foreground">{t.branches.fieldCodeHint}</span>
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-foreground">{t.branches.fieldAddress}</span>
          <Input.TextArea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            autoSize={{ minRows: 2, maxRows: 4 }}
            maxLength={300}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-foreground">{t.branches.fieldPhone}</span>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} inputMode="tel" />
        </label>
      </div>
    </Modal>
  );
}
