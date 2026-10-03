"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Input, Modal, Select } from "antd";
import { Copy, Check } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLanguageStore } from "@/lib/store/languageStore";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { createStaff, updateStaff } from "@/lib/queries/staff/manageStaff";
import type { RoleListItem, StaffListItem } from "@/lib/queries/staff/types";
import {
  buildStaffUsername,
  STAFF_MIN_PASSWORD_LENGTH,
  STAFF_NAME_PATTERN,
} from "@/lib/permissions/staffIdentity";
import { fillTemplate, generatePassword } from "./staffUi";

interface StaffFormModalProps {
  open: boolean;
  /** null = add a new staff member */
  staff: StaffListItem | null;
  roles: RoleListItem[];
  storeSlug: string;
  onClose: () => void;
  onSaved: () => void;
}

interface Credentials {
  name: string;
  username: string;
  password: string;
}

export function StaffFormModal({ open, staff, roles, storeSlug, onClose, onSaved }: StaffFormModalProps) {
  const t = useTranslation();
  const lang = useLanguageStore((s) => s.lang);
  const notify = useSheiNotification();

  const [displayName, setDisplayName] = useState("");
  const [shortName, setShortName] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [roleId, setRoleId] = useState<string | undefined>(undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [copied, setCopied] = useState(false);

  const isEdit = !!staff;

  // Reset only when the modal opens (or switches to another person). Saving
  // reloads the page's staff list, which hands us a new `roles` array while
  // the modal is still open — resetting on that wiped the "Login created"
  // card and dropped the owner straight back into an empty form.
  const rolesRef = useRef(roles);
  useEffect(() => {
    rolesRef.current = roles;
  }, [roles]);
  useEffect(() => {
    if (!open) return;
    const currentRoles = rolesRef.current;
    setDisplayName(staff?.displayName ?? "");
    setShortName("");
    setPassword(staff ? "" : generatePassword());
    setPhone(staff?.phone ?? "");
    setRoleId(
      staff?.roleId ?? currentRoles.find((r) => r.name === "Cashier")?.id ?? currentRoles[0]?.id,
    );
    setErrors({});
    setCredentials(null);
    setCopied(false);
  }, [open, staff]);

  const fullUsername = buildStaffUsername(storeSlug, shortName || "name");

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!displayName.trim()) next.displayName = t.staff.validationName;
    if (!isEdit) {
      if (!STAFF_NAME_PATTERN.test(shortName.trim().toLowerCase())) next.shortName = t.staff.validationUsername;
      if (password.length < STAFF_MIN_PASSWORD_LENGTH) next.password = t.staff.validationPassword;
    }
    if (!roleId) next.roleId = t.staff.validationRole;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !roleId) return;
    setSaving(true);

    if (isEdit && staff) {
      const result = await updateStaff({ staffId: staff.id, displayName, phone, roleId });
      setSaving(false);
      if (!result.ok) {
        notify.error(result.error);
        return;
      }
      notify.success(t.staff.toastUpdated);
      onSaved();
      onClose();
      return;
    }

    const result = await createStaff({ displayName, name: shortName, password, phone, roleId });
    setSaving(false);
    if (!result.ok) {
      notify.error(result.error);
      return;
    }
    notify.success(t.staff.toastCreated);
    setCredentials({ name: displayName.trim(), username: result.data.username, password });
    onSaved();
  };

  const loginUrl = typeof window !== "undefined" ? `${window.location.origin}/admin-login` : "/admin-login";

  const copyCredentials = async () => {
    if (!credentials) return;
    const text = `${t.staff.createdLoginUrl}: ${loginUrl}\n${t.staff.createdUsername}: ${credentials.username}\n${t.staff.createdPassword}: ${credentials.password}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Clipboard can be blocked (http, permissions); the details stay visible to copy by hand.
    }
  };

  if (credentials) {
    return (
      <Modal
        open={open}
        onCancel={onClose}
        title={t.staff.createdTitle}
        footer={[
          <Button key="copy" icon={copied ? <Check size={14} /> : <Copy size={14} />} onClick={copyCredentials}>
            {copied ? t.staff.copied : t.staff.copyDetails}
          </Button>,
          <Button key="done" type="primary" onClick={onClose}>
            {t.staff.done}
          </Button>,
        ]}
      >
        <p className="text-sm text-muted-foreground">
          {fillTemplate(t.staff.createdBody, { name: credentials.name }, lang)}
        </p>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl border border-border bg-muted/40 p-4 text-sm">
          <dt className="text-muted-foreground">{t.staff.createdLoginUrl}</dt>
          <dd className="m-0 font-mono break-all">{loginUrl}</dd>
          <dt className="text-muted-foreground">{t.staff.createdUsername}</dt>
          <dd className="m-0 font-mono break-all">{credentials.username}</dd>
          <dt className="text-muted-foreground">{t.staff.createdPassword}</dt>
          <dd className="m-0 font-mono break-all">{credentials.password}</dd>
        </dl>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={saving}
      okText={isEdit ? t.staff.save : t.staff.create}
      cancelText={t.staff.cancel}
      title={isEdit ? fillTemplate(t.staff.formEditTitle, { name: staff?.displayName ?? "" }, lang) : t.staff.formAddTitle}
      destroyOnHidden
    >
      <div className="space-y-4">
        <Field label={t.staff.fieldName} error={errors.displayName}>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t.staff.fieldNamePlaceholder}
            maxLength={80}
            status={errors.displayName ? "error" : undefined}
            autoFocus
          />
        </Field>

        <Field
          label={t.staff.fieldUsername}
          error={errors.shortName}
          hint={
            isEdit
              ? t.staff.fieldUsernameFixed
              : fillTemplate(t.staff.fieldUsernameHint, { full: fullUsername }, lang)
          }
        >
          {isEdit ? (
            <Input value={staff?.username} disabled />
          ) : (
            <Input
              prefix={<span className="text-muted-foreground">{storeSlug}.</span>}
              value={shortName}
              onChange={(e) => setShortName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              maxLength={30}
              status={errors.shortName ? "error" : undefined}
              autoComplete="off"
            />
          )}
        </Field>

        {!isEdit && (
          <Field label={t.staff.fieldPassword} error={errors.password} hint={t.staff.fieldPasswordHint}>
            <div className="flex gap-2">
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="font-mono"
                status={errors.password ? "error" : undefined}
                autoComplete="new-password"
              />
              <Button onClick={() => setPassword(generatePassword())}>{t.staff.generate}</Button>
            </div>
          </Field>
        )}

        <Field label={t.staff.fieldRole} error={errors.roleId}>
          <Select
            className="w-full"
            value={roleId}
            onChange={setRoleId}
            placeholder={t.staff.fieldRolePlaceholder}
            status={errors.roleId ? "error" : undefined}
            options={roles.map((r) => ({ value: r.id, label: r.name }))}
          />
        </Field>

        <Field label={t.staff.fieldPhone} hint={t.staff.fieldPhoneHint}>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} inputMode="tel" />
        </Field>
      </div>
    </Modal>
  );
}

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

function Field({ label, error, hint, children }: FieldProps) {
  return (
    <div className="space-y-1">
      <span className="block text-sm font-medium text-foreground">{label}</span>
      {children}
      {error ? (
        <span className="block text-xs text-red-500">{error}</span>
      ) : hint ? (
        <span className="block text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </div>
  );
}
