"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Spin, Tabs } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { UserCog, Users } from "lucide-react";
import FeatureLocked from "@/app/components/admin/common/FeatureLocked";
import { StaffTable } from "@/app/components/admin/staff/StaffTable";
import { StaffFormModal } from "@/app/components/admin/staff/StaffFormModal";
import { ResetPasswordModal } from "@/app/components/admin/staff/ResetPasswordModal";
import { RolesPanel } from "@/app/components/admin/staff/RolesPanel";
import { RoleEditorModal } from "@/app/components/admin/staff/RoleEditorModal";
import { fillTemplate } from "@/app/components/admin/staff/staffUi";
import { getStaffOverview } from "@/lib/queries/staff/manageStaff";
import type { RoleListItem, StaffListItem, StaffOverview } from "@/lib/queries/staff/types";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLanguageStore } from "@/lib/store/languageStore";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";

type LoadedOverview = Extract<StaffOverview, { ok: true }>;

/** Owner-only: staff logins and the roles that decide what each can do. */
export default function StaffPage() {
  const t = useTranslation();
  const lang = useLanguageStore((s) => s.lang);
  const notify = useSheiNotification();

  const [overview, setOverview] = useState<LoadedOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"staff" | "roles">("staff");

  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffListItem | null>(null);
  const [resettingStaff, setResettingStaff] = useState<StaffListItem | null>(null);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleListItem | null>(null);

  const load = useCallback(async () => {
    const result = await getStaffOverview();
    if (result.ok) setOverview(result);
    else notify.error(result.error);
    setLoading(false);
  }, [notify]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!overview) return null;
  if (!overview.featureEnabled) return <FeatureLocked title={t.staff.pageTitle} />;

  const unlimited = overview.maxStaff === -1;
  const atLimit = !unlimited && overview.activeCount >= overview.maxStaff;
  const usage = unlimited
    ? fillTemplate(t.staff.usageUnlimited, { current: overview.activeCount }, lang)
    : fillTemplate(t.staff.usageLimited, { current: overview.activeCount, limit: overview.maxStaff }, lang);

  const openAddStaff = () => {
    setEditingStaff(null);
    setStaffModalOpen(true);
  };

  const openNewRole = () => {
    setEditingRole(null);
    setRoleModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 sm:px-8 py-4 sm:py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
              <UserCog size={20} color="white" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white m-0">{t.staff.pageTitle}</h1>
              <p className="text-xs text-gray-400 dark:text-gray-500 m-0">
                {t.staff.pageSubtitle} &middot; {usage}
              </p>
            </div>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={tab === "staff" ? openAddStaff : openNewRole}
            disabled={tab === "staff" && atLimit}
            className="rounded-xl h-9 font-semibold border-none"
            style={{
              background: "linear-gradient(135deg, #10b981, #0d9488)",
              boxShadow: "0 4px 14px rgba(16,185,129,0.4)",
            }}
          >
            {tab === "staff" ? t.staff.addStaff : t.staff.addRole}
          </Button>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-4 space-y-4">
        {atLimit && tab === "staff" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            {fillTemplate(t.staff.limitReached, { limit: overview.maxStaff }, lang)}
          </div>
        )}

        <Tabs
          activeKey={tab}
          onChange={(key) => setTab(key as "staff" | "roles")}
          items={[
            {
              key: "staff",
              label: t.staff.tabStaff,
              children:
                overview.staff.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
                    <Users className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
                    <h2 className="mt-3 text-base font-semibold text-foreground">{t.staff.emptyStaffTitle}</h2>
                    <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                      {t.staff.emptyStaffHint}
                    </p>
                    <Button type="primary" icon={<PlusOutlined />} className="mt-4" onClick={openAddStaff}>
                      {t.staff.addStaff}
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <StaffTable
                      staff={overview.staff}
                      onEdit={(s) => {
                        setEditingStaff(s);
                        setStaffModalOpen(true);
                      }}
                      onResetPassword={setResettingStaff}
                      onChanged={load}
                    />
                  </div>
                ),
            },
            {
              key: "roles",
              label: t.staff.tabRoles,
              children: (
                <RolesPanel
                  roles={overview.roles}
                  onEdit={(role) => {
                    setEditingRole(role);
                    setRoleModalOpen(true);
                  }}
                  onDuplicate={(role) => {
                    setEditingRole({
                      ...role,
                      id: "",
                      name: `${role.name} ${t.staff.roleCopySuffix}`,
                      isSystem: false,
                      memberCount: 0,
                    });
                    setRoleModalOpen(true);
                  }}
                  onChanged={load}
                />
              ),
            },
          ]}
        />
      </div>

      <StaffFormModal
        open={staffModalOpen}
        staff={editingStaff}
        roles={overview.roles}
        storeSlug={overview.storeSlug}
        onClose={() => setStaffModalOpen(false)}
        onSaved={load}
      />
      <ResetPasswordModal staff={resettingStaff} onClose={() => setResettingStaff(null)} onDone={load} />
      <RoleEditorModal
        open={roleModalOpen}
        role={editingRole}
        onClose={() => setRoleModalOpen(false)}
        onSaved={() => {
          setRoleModalOpen(false);
          load();
        }}
      />
    </div>
  );
}
