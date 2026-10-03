"use client";

import { App, Dropdown, Grid, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { MenuProps } from "antd";
import { MoreHorizontal, Pencil, KeyRound, LogOut, Power, Unlock } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLanguageStore } from "@/lib/store/languageStore";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { forceLogoutStaff, setStaffActive, unlockStaff } from "@/lib/queries/staff/manageStaff";
import type { StaffListItem } from "@/lib/queries/staff/types";
import { fillTemplate, formatDateTime } from "./staffUi";
import { useBranches } from "@/lib/context/BranchContext";

interface StaffTableProps {
  staff: StaffListItem[];
  onEdit: (staff: StaffListItem) => void;
  onResetPassword: (staff: StaffListItem) => void;
  onChanged: () => void;
}

export function StaffTable({ staff, onEdit, onResetPassword, onChanged }: StaffTableProps) {
  const t = useTranslation();
  const lang = useLanguageStore((s) => s.lang);
  const notify = useSheiNotification();
  const { modal } = App.useApp();
  const { enabled: branchesOn, branchName } = useBranches();
  const scopeLabel = (s: StaffListItem) =>
    s.allBranches ? t.staff.branchesAll : s.branchIds.map(branchName).filter(Boolean).join(", ");
  // Phones get one card per person instead of a sideways-scrolling table.
  const screens = Grid.useBreakpoint();
  const isWide = screens.md ?? true;

  const isLocked = (s: StaffListItem) =>
    !!s.lockedUntil && new Date(s.lockedUntil).getTime() > Date.now();

  const runAction = async (
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    successMessage: string,
  ) => {
    const result = await action();
    if (!result.ok) {
      notify.error(result.error);
      return;
    }
    notify.success(successMessage);
    onChanged();
  };

  const confirmDeactivate = (s: StaffListItem) =>
    modal.confirm({
      title: fillTemplate(t.staff.confirmDeactivateTitle, { name: s.displayName }, lang),
      content: t.staff.confirmDeactivateBody,
      okText: t.staff.actionDeactivate,
      cancelText: t.staff.cancel,
      okButtonProps: { danger: true },
      onOk: () =>
        runAction(
          () => setStaffActive(s.id, false),
          fillTemplate(t.staff.toastDeactivated, { name: s.displayName }, lang),
        ),
    });

  const confirmForceLogout = (s: StaffListItem) =>
    modal.confirm({
      title: fillTemplate(t.staff.confirmForceLogoutTitle, { name: s.displayName }, lang),
      content: t.staff.confirmForceLogoutBody,
      okText: t.staff.actionForceLogout,
      cancelText: t.staff.cancel,
      onOk: () =>
        runAction(
          () => forceLogoutStaff(s.id),
          fillTemplate(t.staff.toastLoggedOut, { name: s.displayName }, lang),
        ),
    });

  const menuFor = (s: StaffListItem): MenuProps["items"] => [
    { key: "edit", icon: <Pencil size={14} />, label: t.staff.actionEdit, onClick: () => onEdit(s) },
    {
      key: "reset",
      icon: <KeyRound size={14} />,
      label: t.staff.actionResetPassword,
      onClick: () => onResetPassword(s),
    },
    ...(isLocked(s)
      ? [
          {
            key: "unlock",
            icon: <Unlock size={14} />,
            label: t.staff.actionUnlock,
            onClick: () =>
              runAction(
                () => unlockStaff(s.id),
                fillTemplate(t.staff.toastUnlocked, { name: s.displayName }, lang),
              ),
          },
        ]
      : []),
    ...(s.isActive
      ? [
          {
            key: "logout",
            icon: <LogOut size={14} />,
            label: t.staff.actionForceLogout,
            onClick: () => confirmForceLogout(s),
          },
          { type: "divider" as const },
          {
            key: "deactivate",
            icon: <Power size={14} />,
            label: t.staff.actionDeactivate,
            danger: true,
            onClick: () => confirmDeactivate(s),
          },
        ]
      : [
          { type: "divider" as const },
          {
            key: "activate",
            icon: <Power size={14} />,
            label: t.staff.actionActivate,
            onClick: () =>
              runAction(
                () => setStaffActive(s.id, true),
                fillTemplate(t.staff.toastActivated, { name: s.displayName }, lang),
              ),
          },
        ]),
  ];

  const statusTags = (s: StaffListItem) => (
    <div className="flex flex-wrap gap-1">
      {!s.isActive ? (
        <Tag>{t.staff.statusInactive}</Tag>
      ) : isLocked(s) ? (
        <Tag color="orange">{t.staff.statusLocked}</Tag>
      ) : (
        <Tag color="green">{t.staff.statusActive}</Tag>
      )}
      {s.isActive && s.mustChangePassword && <Tag color="blue">{t.staff.mustChangeBadge}</Tag>}
    </div>
  );

  const actionsMenu = (s: StaffListItem) => (
    <Dropdown menu={{ items: menuFor(s) }} trigger={["click"]} placement="bottomRight">
      <button
        type="button"
        className="p-2 -m-1 rounded-lg hover:bg-muted transition shrink-0"
        aria-label={`${t.staff.actionEdit}: ${s.displayName}`}
      >
        <MoreHorizontal size={18} />
      </button>
    </Dropdown>
  );

  const columns: ColumnsType<StaffListItem> = [
    {
      title: t.staff.colName,
      key: "name",
      render: (_, s) => (
        <div className="min-w-0">
          <div className="font-medium text-foreground">{s.displayName}</div>
          {s.phone && <div className="text-xs text-muted-foreground">{s.phone}</div>}
        </div>
      ),
    },
    {
      title: t.staff.colUsername,
      dataIndex: "username",
      key: "username",
      render: (username: string) => <span className="font-mono text-sm">{username}</span>,
    },
    {
      title: t.staff.colRole,
      key: "role",
      render: (_, s) => (
        <div>
          <div>{s.roleName}</div>
          {branchesOn && <div className="text-xs text-muted-foreground">{scopeLabel(s)}</div>}
        </div>
      ),
    },
    {
      title: t.staff.colStatus,
      key: "status",
      render: (_, s) => statusTags(s),
    },
    {
      title: t.staff.colLastLogin,
      key: "lastLogin",
      render: (_, s) => (
        <span className="text-sm text-muted-foreground">
          {s.lastLoginAt ? formatDateTime(s.lastLoginAt, lang) : t.staff.neverLoggedIn}
        </span>
      ),
    },
    {
      key: "actions",
      width: 56,
      align: "right",
      render: (_, s) => actionsMenu(s),
    },
  ];

  if (!isWide) {
    return (
      <ul className="divide-y divide-border m-0 p-0 list-none">
        {staff.map((s) => (
          <li key={s.id} className={`flex gap-3 px-4 py-3 ${s.isActive ? "" : "opacity-60"}`}>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-foreground truncate">{s.displayName}</div>
                  <div className="font-mono text-xs text-muted-foreground break-all">{s.username}</div>
                </div>
                {actionsMenu(s)}
              </div>
              <div className="text-sm text-foreground">
                {s.roleName}
                {branchesOn && <span className="text-muted-foreground"> · {scopeLabel(s)}</span>}
              </div>
              {statusTags(s)}
              <div className="text-xs text-muted-foreground">
                {t.staff.colLastLogin}:{" "}
                {s.lastLoginAt ? formatDateTime(s.lastLoginAt, lang) : t.staff.neverLoggedIn}
              </div>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Table<StaffListItem>
      rowKey="id"
      columns={columns}
      dataSource={staff}
      pagination={false}
      scroll={{ x: 720 }}
      rowClassName={(s) => (s.isActive ? "" : "opacity-60")}
    />
  );
}
