"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DatePicker, Drawer, Empty, Grid, Pagination, Select, Spin, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { Dayjs } from "dayjs";
import { History } from "lucide-react";
import { getActivityLog, type ActivityLogFilters } from "@/lib/queries/staff/getActivityLog";
import type { ActivityPerson, ActivityRow } from "@/lib/queries/staff/types";
import { PERMISSION_AREAS } from "@/lib/permissions/catalog";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLanguageStore } from "@/lib/store/languageStore";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { formatDateTime } from "@/app/components/admin/staff/staffUi";
import type { Lang, translations } from "@/lib/i18n/translations";
import { useBranches } from "@/lib/context/BranchContext";

// Either language's strings — useTranslation() returns one or the other.
type Strings = (typeof translations)[Lang];

const PAGE_SIZE = 25;

/** Filter groups -> the action prefixes each one covers. */
const ACTION_GROUPS: Record<string, string[]> = {
  auth: ["auth."],
  orders: ["orders.", "pos.", "courier."],
  stock: ["stock.", "products.", "categories.", "transfers.", "branch."],
  money: ["expenses.", "cod.", "register.", "customers.collect_payment", "vendors."],
  staff: ["staff.", "role."],
};

/** Exact labels for the actions this feature writes itself. */
function fixedActionLabel(action: string, t: Strings): string | null {
  const labels: Record<string, string> = {
    "auth.login": t.staff.actionAuthLogin,
    "auth.login_failed": t.staff.actionAuthLoginFailed,
    "auth.locked": t.staff.actionAuthLocked,
    "auth.password_changed": t.staff.actionAuthPasswordChanged,
    "staff.create": t.staff.actionStaffCreate,
    "staff.update": t.staff.actionStaffUpdate,
    "staff.deactivate": t.staff.actionStaffDeactivate,
    "staff.activate": t.staff.actionStaffActivate,
    "staff.reset_password": t.staff.actionStaffResetPassword,
    "staff.force_logout": t.staff.actionStaffForceLogout,
    "staff.unlock": t.staff.actionStaffUnlock,
    "role.create": t.staff.actionRoleCreate,
    "role.update": t.staff.actionRoleUpdate,
    "role.delete": t.staff.actionRoleDelete,
    "branch.enable": t.staff.actionBranchEnable,
    "branch.create": t.staff.actionBranchCreate,
    "branch.update": t.staff.actionBranchUpdate,
    "branch.reorder": t.staff.actionBranchReorder,
    "branch.activate": t.staff.actionBranchActivate,
    "branch.deactivate": t.staff.actionBranchDeactivate,
    "branch.delete": t.staff.actionBranchDelete,
  };
  return labels[action] ?? null;
}

/** "orders.delete" -> "Deleted · Orders" for actions logged by the dashboard areas. */
function actionLabel(action: string, t: Strings, lang: "en" | "bn"): string {
  const fixed = fixedActionLabel(action, t);
  if (fixed) return fixed;
  const [areaKey, verb] = action.split(".");
  const area = PERMISSION_AREAS.find((a) => a.key === areaKey);
  const verbs: Record<string, string> = {
    add: t.staff.verbAdd,
    edit: t.staff.verbEdit,
    delete: t.staff.verbDelete,
    cancel: t.staff.verbCancel,
    change_status: t.staff.verbChangeStatus,
    collect_payment: t.staff.verbCollectPayment,
    send: t.staff.verbSend,
    receive: t.staff.verbReceive,
    move_branch: t.staff.verbMoveBranch,
  };
  const verbLabel = verbs[verb] ?? t.staff.verbOther;
  return area ? `${verbLabel} · ${lang === "bn" ? area.labelBn : area.label}` : action;
}

function actionColor(action: string): string | undefined {
  if (action === "auth.login_failed" || action === "auth.locked") return "orange";
  if (action.endsWith(".delete") || action === "staff.deactivate") return "red";
  if (action.startsWith("auth.")) return "blue";
  return undefined;
}

/** Shortens a user agent to "Chrome · Android" style. */
function describeDevice(userAgent: string | null): string {
  if (!userAgent) return "";
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /Chrome\//.test(userAgent)
      ? "Chrome"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : "Browser";
  const os = /Android/.test(userAgent)
    ? "Android"
    : /iPhone|iPad/.test(userAgent)
      ? "iOS"
      : /Windows/.test(userAgent)
        ? "Windows"
        : /Mac OS/.test(userAgent)
          ? "macOS"
          : /Linux/.test(userAgent)
            ? "Linux"
            : "";
  return [browser, os].filter(Boolean).join(" · ");
}

/** Every login and important action in the store, newest first. Needs activity.view. */
export default function ActivityPage() {
  const t = useTranslation();
  const lang = useLanguageStore((s) => s.lang);
  const notify = useSheiNotification();
  // Phones get one card per entry instead of a sideways-scrolling table.
  const screens = Grid.useBreakpoint();
  const isWide = screens.md ?? true;

  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [people, setPeople] = useState<ActivityPerson[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [actionGroup, setActionGroup] = useState<string | null>(null);
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [selected, setSelected] = useState<ActivityRow | null>(null);
  // Stores with branches: the log follows the header's branch.
  const { enabled: branchesOn, loading: branchesLoading, selectedBranchId, branchName } = useBranches();
  const logBranchId = branchesOn ? selectedBranchId : null;
  const showBranch = branchesOn && !logBranchId;

  const load = useCallback(async () => {
    if (branchesLoading) return;
    setLoading(true);
    const filters: ActivityLogFilters = {
      page,
      pageSize: PAGE_SIZE,
      userId,
      actionPrefixes: actionGroup ? ACTION_GROUPS[actionGroup] : null,
      from: range?.[0]?.format("YYYY-MM-DD") ?? null,
      to: range?.[1]?.format("YYYY-MM-DD") ?? null,
      branchId: logBranchId,
    };
    const result = await getActivityLog(filters);
    if (result.ok) {
      setRows(result.rows);
      setTotal(result.total);
      setPeople(result.people);
    } else {
      notify.error(result.error);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, userId, actionGroup, range, logBranchId, branchesLoading]);

  // A different branch starts again from the first page.
  useEffect(() => {
    setPage(1);
  }, [logBranchId]);

  useEffect(() => {
    load();
  }, [load]);

  const actionGroups = useMemo(
    () => [
      { value: "auth", label: t.staff.groupAuth },
      { value: "orders", label: t.staff.groupOrders },
      { value: "stock", label: t.staff.groupStock },
      { value: "money", label: t.staff.groupMoney },
      { value: "staff", label: t.staff.groupStaff },
    ],
    [t],
  );

  const columns: ColumnsType<ActivityRow> = [
    {
      title: t.staff.colWhen,
      dataIndex: "createdAt",
      key: "when",
      width: 170,
      render: (iso: string) => <span className="text-sm whitespace-nowrap">{formatDateTime(iso, lang)}</span>,
    },
    {
      title: t.staff.colWho,
      key: "who",
      render: (_, r) => (
        <div>
          <div className="text-sm text-foreground">{r.actorName ?? t.staff.unknownUser}</div>
          {r.actorRole && <div className="text-xs text-muted-foreground">{r.actorRole}</div>}
        </div>
      ),
    },
    {
      title: t.staff.colWhat,
      key: "what",
      render: (_, r) => <Tag color={actionColor(r.action)}>{actionLabel(r.action, t, lang)}</Tag>,
    },
    {
      title: t.staff.colDetails,
      key: "details",
      render: (_, r) => (
        <div className="text-sm text-foreground">
          {showBranch && r.branchId && (
            <Tag color="cyan" className="mr-1">
              {branchName(r.branchId)}
            </Tag>
          )}
          {r.summary}
          {r.action.startsWith("auth.") && r.userAgent && (
            <div className="text-xs text-muted-foreground">
              {describeDevice(r.userAgent)}
              {r.ip ? ` · ${r.ip}` : ""}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "view",
      width: 72,
      align: "right",
      render: (_, r) => (
        <button type="button" className="text-sm text-primary hover:underline" onClick={() => setSelected(r)}>
          {t.staff.viewDetails}
        </button>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 sm:px-8 py-4 sm:py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-400 to-violet-600 flex items-center justify-center">
            <History size={20} color="white" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white m-0">{t.staff.activityTitle}</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 m-0">{t.staff.activitySubtitle}</p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          <Select
            allowClear
            className="w-full sm:w-auto sm:min-w-[180px]"
            placeholder={t.staff.filterAllPeople}
            aria-label={t.staff.filterPerson}
            value={userId ?? undefined}
            onChange={(v?: string) => {
              setPage(1);
              setUserId(v ?? null);
            }}
            options={people.map((p) => ({ value: p.userId, label: p.name }))}
          />
          <Select
            allowClear
            className="w-full sm:w-auto sm:min-w-[180px]"
            placeholder={t.staff.filterAllActions}
            aria-label={t.staff.filterAction}
            value={actionGroup ?? undefined}
            onChange={(v?: string) => {
              setPage(1);
              setActionGroup(v ?? null);
            }}
            options={actionGroups}
          />
          <DatePicker.RangePicker
            className="w-full sm:w-auto"
            value={range}
            onChange={(v) => {
              setPage(1);
              setRange(v as [Dayjs | null, Dayjs | null] | null);
            }}
          />
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {isWide ? (
            <Table<ActivityRow>
              rowKey="id"
              columns={columns}
              dataSource={rows}
              loading={loading}
              pagination={false}
              scroll={{ x: 760 }}
              locale={{ emptyText: t.staff.emptyActivity }}
            />
          ) : loading ? (
            <div className="flex justify-center py-10">
              <Spin />
            </div>
          ) : rows.length === 0 ? (
            <Empty className="py-8" description={t.staff.emptyActivity} />
          ) : (
            <ul className="divide-y divide-border m-0 p-0 list-none">
              {rows.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(r)}
                    className="w-full text-left px-4 py-3 space-y-1 hover:bg-muted/50 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Tag color={actionColor(r.action)} className="m-0">
                        {actionLabel(r.action, t, lang)}
                      </Tag>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(r.createdAt, lang)}
                      </span>
                    </div>
                    <div className="text-sm text-foreground">
                      {r.actorName ?? t.staff.unknownUser}
                      {r.actorRole && <span className="text-muted-foreground"> · {r.actorRole}</span>}
                    </div>
                    {showBranch && r.branchId && (
                      <Tag color="cyan" className="mt-1">
                        {branchName(r.branchId)}
                      </Tag>
                    )}
                    {r.summary && <div className="text-sm text-muted-foreground break-words">{r.summary}</div>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {total > PAGE_SIZE && (
          <div className="flex justify-end">
            <Pagination current={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} showSizeChanger={false} size="small" />
          </div>
        )}
      </div>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={t.staff.detailsTitle} size={isWide ? "large" : "100%"}>
        {selected && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">{t.staff.colWhen}</dt>
            <dd className="m-0">{formatDateTime(selected.createdAt, lang)}</dd>
            <dt className="text-muted-foreground">{t.staff.colWho}</dt>
            <dd className="m-0">
              {selected.actorName ?? t.staff.unknownUser}
              {selected.actorRole ? ` (${selected.actorRole})` : ""}
            </dd>
            <dt className="text-muted-foreground">{t.staff.colWhat}</dt>
            <dd className="m-0">{actionLabel(selected.action, t, lang)}</dd>
            <dt className="text-muted-foreground">{t.staff.colDetails}</dt>
            <dd className="m-0">{selected.summary}</dd>
            {selected.userAgent && (
              <>
                <dt className="text-muted-foreground">{t.staff.deviceLabel}</dt>
                <dd className="m-0">{describeDevice(selected.userAgent)}</dd>
              </>
            )}
            {selected.ip && (
              <>
                <dt className="text-muted-foreground">{t.staff.ipLabel}</dt>
                <dd className="m-0 font-mono">{selected.ip}</dd>
              </>
            )}
            {selected.details && (
              <dd className="col-span-2 m-0 mt-2">
                <pre className="max-h-[50vh] overflow-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap break-all">
                  {JSON.stringify(selected.details, null, 2)}
                </pre>
              </dd>
            )}
          </dl>
        )}
      </Drawer>
    </div>
  );
}
