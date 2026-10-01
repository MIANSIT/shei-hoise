"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/app/components/common/PasswordField";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { changeOwnPassword } from "@/lib/queries/staff/changeOwnPassword";
import { usePermissions } from "@/lib/context/PermissionsContext";
import { STAFF_MIN_PASSWORD_LENGTH } from "@/lib/permissions/staffIdentity";

/** Staff land here after their first login (or an owner reset) until they set their own password. */
export default function ChangePasswordPage() {
  const t = useTranslation();
  const notify = useSheiNotification();
  const { refresh } = usePermissions();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < STAFF_MIN_PASSWORD_LENGTH) {
      setError(t.staff.validationPassword);
      return;
    }
    if (password !== confirm) {
      setError(t.staff.passwordsDontMatch);
      return;
    }

    setSaving(true);
    const result = await changeOwnPassword(password);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    notify.success(t.staff.changeDone);
    await refresh();
    window.location.assign("/dashboard");
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="max-w-md w-full bg-background rounded-2xl shadow-xl p-8 border border-border space-y-4"
        noValidate
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <KeyRound className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground">{t.staff.changeTitle}</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{t.staff.changeBody}</p>
        </div>

        <PasswordField
          id="new-password"
          label={t.staff.fieldNewPassword}
          value={password}
          onChange={setPassword}
          disabled={saving}
        />
        <PasswordField
          id="confirm-password"
          label={t.staff.fieldConfirmPassword}
          value={confirm}
          onChange={setConfirm}
          disabled={saving}
        />

        {error && (
          <p className="text-sm text-red-500" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" variant="greenish" className="w-full" disabled={saving || !password || !confirm}>
          <span className="text-white">{t.staff.changeSubmit}</span>
        </Button>
      </form>
    </div>
  );
}
