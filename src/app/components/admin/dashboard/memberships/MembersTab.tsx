"use client";

import { useMemo, useState } from "react";
import { Empty, Popconfirm, Select, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { Crown, ImageIcon, Mail, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";
import type { Member, MembershipPlan, MembershipStatus } from "@/lib/queries/membership/membershipTypes";

interface MembersTabProps {
  members: readonly Member[];
  plans: readonly MembershipPlan[];
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onAssign: () => void;
  onEdit: (member: Member) => void;
  onRemove: (member: Member) => Promise<void>;
  /** Opens the member's welcome message in Gmail, from the store's own account. */
  onOpenGmail: (member: Member) => void;
  /** Copies the member's card picture, to paste into a message where the card should go. */
  onCopyCard: (member: Member) => void;
  /** Shown when there is no level yet, so memberships can't be given. */
  onGoLevels: () => void;
}

type StatusFilter = "all" | MembershipStatus;

const formatDate = (iso: string) => dayjs(iso).format("DD-MM-YYYY");

export default function MembersTab({
  members,
  plans,
  canAdd,
  canEdit,
  canDelete,
  onAssign,
  onEdit,
  onRemove,
  onOpenGmail,
  onCopyCard,
  onGoLevels,
}: MembersTabProps) {
  const t = useTranslation();
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (planFilter && m.planId !== planFilter) return false;
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (!q) return true;
      return (
        m.customerName.toLowerCase().includes(q) ||
        (m.customerPhone ?? "").includes(q) ||
        m.membershipNumber.toLowerCase().includes(q)
      );
    });
  }, [members, search, planFilter, statusFilter]);

  const columns: ColumnsType<Member> = [
    {
      title: t.admin.mbColMember,
      key: "member",
      render: (_, m) => (
        <div className="min-w-0">
          <div className="font-semibold text-foreground">{m.customerName}</div>
          {m.customerPhone && <div className="text-xs text-muted-foreground">{m.customerPhone}</div>}
        </div>
      ),
    },
    {
      title: t.admin.mbColNumber,
      dataIndex: "membershipNumber",
      key: "number",
      render: (value: string, m) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="font-mono text-sm">{value}</span>
          {m.welcomeEmailSentAt && (
            <span title={`${t.admin.mbEmailSentTag}${m.welcomeEmailTo ? `: ${m.welcomeEmailTo}` : ""}`}>
              <Mail size={13} className="text-emerald-600" aria-label={t.admin.mbEmailSentTag} />
            </span>
          )}
          {!m.welcomeEmailSentAt && m.welcomeEmailError && (
            <span title={`${t.admin.mbEmailFailedTag}: ${m.welcomeEmailError}`}>
              <Mail size={13} className="text-rose-600" aria-label={t.admin.mbEmailFailedTag} />
            </span>
          )}
          {m.source === "auto" && (
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
              {t.admin.mbSourceAuto}
            </span>
          )}
        </span>
      ),
    },
    { title: t.admin.mbColLevel, dataIndex: "planName", key: "level" },
    {
      title: t.admin.mbColValid,
      key: "valid",
      render: (_, m) => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {formatDate(m.startsOn)} – {m.endsOn ? formatDate(m.endsOn) : t.admin.mbNoEnd}
        </span>
      ),
    },
    {
      title: t.admin.mbColStatus,
      key: "status",
      render: (_, m) => (
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            m.status === "active"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
          }`}
        >
          {m.status === "active" ? t.admin.mbStatusActive : t.admin.mbStatusExpired}
        </span>
      ),
    },
    {
      title: "",
      key: "actions",
      align: "right",
      render: (_, m) => (
        <div className="flex items-center justify-end gap-1">
          {canEdit && (
            <button
              type="button"
              onClick={() => onOpenGmail(m)}
              aria-label={t.admin.mbOpenGmail}
              title={t.admin.mbOpenGmail}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Mail size={15} aria-hidden="true" />
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={() => onCopyCard(m)}
              aria-label={t.admin.mbCopyCard}
              title={t.admin.mbCopyCard}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ImageIcon size={15} aria-hidden="true" />
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={() => onEdit(m)}
              aria-label={t.admin.mbEdit}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Pencil size={15} aria-hidden="true" />
            </button>
          )}
          {canDelete && (
            <Popconfirm
              title={t.admin.mbRemoveConfirm}
              okText={t.admin.mbRemoveYes}
              cancelText={t.admin.mbCancel}
              okButtonProps={{ danger: true }}
              onConfirm={() => onRemove(m)}
            >
              <button
                type="button"
                aria-label={t.admin.mbDelete}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-rose-600"
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </Popconfirm>
          )}
        </div>
      ),
    },
  ];

  const statusChip = (value: StatusFilter, label: string) => (
    <button
      key={value}
      type="button"
      onClick={() => setStatusFilter(value)}
      className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
        statusFilter === value ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border border-border hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );

  if (plans.length === 0) {
    return (
      <Empty description={t.admin.mbNeedLevelFirst}>
        <button
          type="button"
          onClick={onGoLevels}
          className="inline-flex items-center gap-1.5 rounded-xl h-9 px-3.5 bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          <Crown size={15} aria-hidden="true" />
          {t.admin.mbGoLevels}
        </button>
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.admin.mbSearch}
            className="w-full pl-9 pr-3 py-2 rounded-xl text-sm bg-card border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>
        <Select
          value={planFilter}
          onChange={setPlanFilter}
          className="w-full sm:w-48"
          size="large"
          options={[{ value: "", label: t.admin.mbAllLevels }, ...plans.map((p) => ({ value: p.id, label: p.name }))]}
        />
        <div className="flex items-center gap-1.5">
          {statusChip("all", t.admin.mbStatusAll)}
          {statusChip("active", t.admin.mbStatusActive)}
          {statusChip("expired", t.admin.mbStatusExpired)}
        </div>
        {canAdd && (
          <button
            type="button"
            onClick={onAssign}
            className="sm:ml-auto inline-flex items-center gap-1.5 rounded-xl h-9 px-3.5 bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus size={15} aria-hidden="true" />
            {t.admin.mbAssign}
          </button>
        )}
      </div>

      {members.length === 0 ? (
        <Empty description={t.admin.mbEmptyMembersTitle}>
          <p className="text-xs text-muted-foreground m-0">{t.admin.mbEmptyMembersSub}</p>
        </Empty>
      ) : (
        <Table<Member>
          rowKey="id"
          columns={columns}
          dataSource={shown}
          pagination={{ pageSize: 20, hideOnSinglePage: true, showSizeChanger: false }}
          scroll={{ x: "max-content" }}
        />
      )}
    </div>
  );
}
