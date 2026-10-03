"use client";

import { App, Button, Tag } from "antd";
import { Copy, Pencil, Trash2, ShieldCheck } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLanguageStore } from "@/lib/store/languageStore";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { deleteRole } from "@/lib/queries/staff/manageRoles";
import { areaAccess, PERMISSION_AREAS } from "@/lib/permissions/catalog";
import type { RoleListItem } from "@/lib/queries/staff/types";
import { fillTemplate } from "./staffUi";

interface RolesPanelProps {
  roles: RoleListItem[];
  onEdit: (role: RoleListItem) => void;
  onDuplicate: (role: RoleListItem) => void;
  onChanged: () => void;
}

const VISIBLE_AREA_TAGS = 5;

export function RolesPanel({ roles, onEdit, onDuplicate, onChanged }: RolesPanelProps) {
  const t = useTranslation();
  const lang = useLanguageStore((s) => s.lang);
  const notify = useSheiNotification();
  const { modal } = App.useApp();

  const confirmDelete = (role: RoleListItem) =>
    modal.confirm({
      title: fillTemplate(t.staff.confirmDeleteRoleTitle, { name: role.name }, lang),
      content: t.staff.confirmDeleteRoleBody,
      okText: t.staff.roleDelete,
      cancelText: t.staff.cancel,
      okButtonProps: { danger: true },
      onOk: async () => {
        const result = await deleteRole(role.id);
        if (!result.ok) {
          notify.error(result.error);
          return;
        }
        notify.success(t.staff.toastRoleDeleted);
        onChanged();
      },
    });

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground m-0 max-w-[68ch]">{t.staff.rolesHint}</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {roles.map((role) => (
          <article
            key={role.id}
            className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-foreground m-0 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" aria-hidden="true" />
                  <span className="truncate">{role.name}</span>
                </h3>
                {role.description && (
                  <p className="text-xs text-muted-foreground m-0 mt-1">{role.description}</p>
                )}
              </div>
              {role.isSystem && <Tag className="shrink-0">{t.staff.roleSystemBadge}</Tag>}
            </div>
            <AreaTags permissions={role.permissions} />
            <div className="text-xs text-muted-foreground">
              {fillTemplate(t.staff.roleMembers, { count: role.memberCount }, lang)}
            </div>
            <div className="mt-auto flex flex-wrap gap-2">
              <Button size="small" icon={<Pencil size={13} />} onClick={() => onEdit(role)}>
                {t.staff.roleEdit}
              </Button>
              <Button size="small" icon={<Copy size={13} />} onClick={() => onDuplicate(role)}>
                {t.staff.roleDuplicate}
              </Button>
              {!role.isSystem && (
                <Button
                  size="small"
                  danger
                  icon={<Trash2 size={13} />}
                  onClick={() => confirmDelete(role)}
                  disabled={role.memberCount > 0}
                >
                  {t.staff.roleDelete}
                </Button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

/** The areas a role can open, as short tags; delete rights in red. */
function AreaTags({ permissions }: { permissions: string[] }) {
  const t = useTranslation();
  const lang = useLanguageStore((s) => s.lang);
  const held = new Set(permissions);
  const open = PERMISSION_AREAS.filter((area) => areaAccess(area, held) !== "none");

  if (open.length === 0) {
    return <span className="text-xs text-muted-foreground">{t.staff.roleNoAccess}</span>;
  }

  const shown = open.slice(0, VISIBLE_AREA_TAGS);
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((area) => (
        <Tag
          key={area.key}
          color={held.has(`${area.key}.delete`) ? "red" : undefined}
          className="m-0"
        >
          {lang === "bn" ? area.labelBn : area.label}
        </Tag>
      ))}
      {open.length > shown.length && (
        <Tag className="m-0">
          {fillTemplate(t.staff.moreCount, { count: open.length - shown.length }, lang)}
        </Tag>
      )}
    </div>
  );
}
