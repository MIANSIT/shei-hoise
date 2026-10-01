"use client";

import { useEffect, useState } from "react";
import { Button, Input, Modal } from "antd";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLanguageStore } from "@/lib/store/languageStore";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { resetStaffPassword } from "@/lib/queries/staff/manageStaff";
import type { StaffListItem } from "@/lib/queries/staff/types";
import { STAFF_MIN_PASSWORD_LENGTH } from "@/lib/permissions/staffIdentity";
import { fillTemplate, generatePassword } from "./staffUi";

interface ResetPasswordModalProps {
  staff: StaffListItem | null;
  onClose: () => void;
  onDone: () => void;
}

export function ResetPasswordModal({ staff, onClose, onDone }: ResetPasswordModalProps) {
  const t = useTranslation();
  const lang = useLanguageStore((s) => s.lang);
  const notify = useSheiNotification();
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (staff) setPassword(generatePassword());
  }, [staff]);

  const tooShort = password.length < STAFF_MIN_PASSWORD_LENGTH;

  const handleReset = async () => {
    if (!staff || tooShort) return;
    setSaving(true);
    const result = await resetStaffPassword(staff.id, password);
    setSaving(false);
    if (!result.ok) {
      notify.error(result.error);
      return;
    }
    notify.success(t.staff.toastPasswordReset);
    onDone();
    onClose();
  };

  return (
    <Modal
      open={!!staff}
      onCancel={onClose}
      onOk={handleReset}
      okButtonProps={{ disabled: tooShort }}
      confirmLoading={saving}
      okText={t.staff.actionResetPassword}
      cancelText={t.staff.cancel}
      title={fillTemplate(t.staff.resetTitle, { name: staff?.displayName ?? "" }, lang)}
      destroyOnHidden
    >
      <p className="text-sm text-muted-foreground">{t.staff.resetBody}</p>
      <div className="mt-4 space-y-1">
        <span className="block text-sm font-medium text-foreground">{t.staff.fieldNewPassword}</span>
        <div className="flex gap-2">
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="font-mono"
            status={tooShort && password ? "error" : undefined}
            autoComplete="new-password"
          />
          <Button onClick={() => setPassword(generatePassword())}>{t.staff.generate}</Button>
        </div>
        <span className="block text-xs text-muted-foreground">{t.staff.validationPassword}</span>
      </div>
    </Modal>
  );
}
