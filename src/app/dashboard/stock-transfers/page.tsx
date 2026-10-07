"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { App, Button, Checkbox, Drawer, Empty, Grid, Input, Pagination, Segmented, Spin, Tag, Tooltip } from "antd";
import {
  CheckCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  DownOutlined,
  PlusOutlined,
  RightOutlined,
  SendOutlined,
  UpOutlined,
} from "@ant-design/icons";
import { ArrowLeftRight, ArrowRight, Building2 } from "lucide-react";
import FeatureLocked from "@/app/components/admin/common/FeatureLocked";
import { MenuLabel } from "@/app/components/admin/common/MenuLabel";
import { TransferDrawer } from "@/app/components/admin/branches/TransferDrawer";
import { formatDateTime } from "@/app/components/admin/staff/staffUi";
import { useBranches } from "@/lib/context/BranchContext";
import { usePermissions } from "@/lib/context/PermissionsContext";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLanguageStore } from "@/lib/store/languageStore";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import {
  cancelTransfer,
  cancelTransferItem,
  cancelTransferItems,
  receiveTransferItems,
  getTransfers,
  receiveTransfer,
  sendTransfer,
} from "@/lib/queries/branches/transfers";
import type { TransferItem, TransferListItem, TransferStatus } from "@/lib/queries/branches/types";

const PAGE_SIZE = 20;
const STATUS_COLOR: Record<TransferStatus, string | undefined> = {
  draft: undefined,
  sent: "blue",
  received: "green",
  cancelled: "default",
};

/** The coloured strip on a card's left edge says where the transfer is at a glance. */
const STATUS_BAR: Record<TransferStatus, string> = {
  draft: "bg-slate-300 dark:bg-slate-600",
  sent: "bg-sky-500",
  received: "bg-emerald-500",
  cancelled: "bg-rose-300 dark:bg-rose-500/60",
};

/** Stock moving between branches: draft → sent (in transit) → received. */
export default function StockTransfersPage() {
  const t = useTranslation();
  const lang = useLanguageStore((s) => s.lang);
  const n = useLocalNum();
  const notify = useSheiNotification();
  const { modal } = App.useApp();
  const { loading: branchesLoading, setup, branches, refresh: refreshBranches } = useBranches();
  const { can, isOwner } = usePermissions();

  const [rows, setRows] = useState<TransferListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  // Active = work to do (draft, in transit); History = finished (received, cancelled).
  const [view, setView] = useState<"active" | "history">("active");
  const [historyFilter, setHistoryFilter] = useState<"all" | "received" | "cancelled">("all");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<TransferListItem | null>(null);
  const screens = Grid.useBreakpoint();
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  // Lines ticked for removal, per transfer.
  // Transfers whose full product list is open.
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [selectedItems, setSelectedItems] = useState<Record<string, string[]>>({});

  const branchesOn = !!setup?.featureEnabled && !!setup?.branchesOn;

  const load = useCallback(async () => {
    if (!branchesOn) return;
    setLoading(true);
    const statuses: TransferStatus[] =
      view === "active" ? ["draft", "sent"] : historyFilter === "all" ? ["received", "cancelled"] : [historyFilter];
    const result = await getTransfers({
      page,
      pageSize: PAGE_SIZE,
      statuses,
      search: view === "history" ? search : undefined,
    });
    if (result.ok) {
      setRows(result.rows);
      setTotal(result.total);
    } else {
      notify.error(result.error);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchesOn, page, view, historyFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  if (branchesLoading && !setup) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }
  if (!setup?.featureEnabled) return <FeatureLocked title={<MenuLabel labelKey="menuStockTransfers" />} />;

  if (!setup.branchesOn) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-3">
          <ArrowLeftRight className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">{t.branches.transfersNeedBranches}</p>
          {isOwner && (
            <Link href="/dashboard/branches" className="text-primary hover:underline text-sm font-medium">
              {t.branches.goToBranches}
            </Link>
          )}
        </div>
      </div>
    );
  }

  const canUse = (branchId: string) => branches.some((b) => b.id === branchId);

  const act = async (
    row: TransferListItem,
    action: (id: string) => Promise<{ ok: true } | { ok: false; error: string }>,
    success: string,
  ) => {
    setBusyId(row.id);
    const result = await action(row.id);
    setBusyId(null);
    if (!result.ok) {
      notify.error(result.error);
      return;
    }
    notify.success(success.replace("{number}", row.transferNumber));
    await Promise.all([load(), refreshBranches()]);
  };

  const confirmCancel = (row: TransferListItem) =>
    modal.confirm({
      title: t.branches.confirmCancelTitle.replace("{number}", row.transferNumber),
      content: row.status === "sent" ? t.branches.confirmCancelSentBody : t.branches.confirmCancelDraftBody,
      okText: t.branches.cancelTransfer,
      cancelText: t.branches.keep,
      okButtonProps: { danger: true },
      onOk: () => act(row, cancelTransfer, t.branches.toastTransferCancelled),
    });

  const confirmCancelItem = (row: TransferListItem, item: TransferItem) => {
    const product = item.variantName ? `${item.productName} — ${item.variantName}` : item.productName;
    modal.confirm({
      title: t.branches.confirmCancelItemTitle.replace("{product}", product).replace("{number}", row.transferNumber),
      content: row.status === "sent" ? t.branches.confirmCancelItemSentBody : t.branches.confirmCancelItemDraftBody,
      okText: t.branches.cancelTransferItem,
      cancelText: t.branches.keep,
      okButtonProps: { danger: true },
      onOk: async () => {
        setBusyId(row.id);
        const result = await cancelTransferItem(row.id, item.id);
        setBusyId(null);
        if (!result.ok) {
          notify.error(result.error);
          return;
        }
        notify.success(
          t.branches.toastTransferItemCancelled.replace("{product}", product).replace("{number}", row.transferNumber),
        );
        await Promise.all([load(), refreshBranches()]);
      },
    });
  };

  const toggleItem = (transferId: string, itemId: string, checked: boolean) =>
    setSelectedItems((prev) => {
      const current = prev[transferId] ?? [];
      return { ...prev, [transferId]: checked ? [...current, itemId] : current.filter((id) => id !== itemId) };
    });

  const confirmCancelSelected = (row: TransferListItem, itemIds: string[]) =>
    modal.confirm({
      title: t.branches.confirmCancelItemsTitle.replace("{count}", n(itemIds.length)).replace("{number}", row.transferNumber),
      content: row.status === "sent" ? t.branches.confirmCancelItemSentBody : t.branches.confirmCancelItemDraftBody,
      okText: t.branches.cancelTransferItem,
      cancelText: t.branches.keep,
      okButtonProps: { danger: true },
      onOk: async () => {
        setBusyId(row.id);
        const result = await cancelTransferItems(row.id, itemIds);
        setBusyId(null);
        setSelectedItems((prev) => ({ ...prev, [row.id]: [] }));
        if (!result.ok) {
          notify.error(result.error);
        } else {
          notify.success(
            t.branches.toastTransferItemsCancelled.replace("{count}", n(result.data.removed)).replace("{number}", row.transferNumber),
          );
        }
        await Promise.all([load(), refreshBranches()]);
      },
    });

  const receiveLines = async (row: TransferListItem, itemIds: string[]) => {
    setBusyId(row.id);
    const result = await receiveTransferItems(row.id, itemIds);
    setBusyId(null);
    setSelectedItems((prev) => ({ ...prev, [row.id]: [] }));
    if (!result.ok) {
      notify.error(result.error);
    } else {
      notify.success(
        t.branches.toastTransferItemsReceived.replace("{count}", n(result.data.received)).replace("{number}", row.transferNumber),
      );
    }
    await Promise.all([load(), refreshBranches()]);
  };

  const confirmReceiveSelected = (row: TransferListItem, itemIds: string[]) =>
    modal.confirm({
      title: t.branches.confirmReceiveItemsTitle.replace("{count}", n(itemIds.length)).replace("{number}", row.transferNumber),
      content: t.branches.confirmReceiveItemsBody,
      okText: t.branches.receiveItem,
      cancelText: t.branches.keep,
      onOk: () => receiveLines(row, itemIds),
    });

  const statusLabel: Record<TransferStatus, string> = {
    draft: t.branches.statusDraft,
    sent: t.branches.statusSent,
    received: t.branches.statusReceived,
    cancelled: t.branches.statusCancelled,
  };

  /** One finished transfer as a compact line; click it for the full story. */
  const renderHistoryRow = (row: TransferListItem) => (
    <li key={row.id}>
      <button
        type="button"
        onClick={() => setDetail(row)}
        className="flex w-full flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/50"
      >
        <span className="flex min-w-28 items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${STATUS_BAR[row.status]}`} aria-hidden="true" />
          <span className="font-mono text-sm font-bold text-foreground">{row.transferNumber}</span>
        </span>
        <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-foreground">
          {row.fromBranchName}
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          {row.toBranchName}
        </span>
        <span className="text-xs text-muted-foreground">
          {t.branches.transferSummary.replace("{items}", n(row.itemCount)).replace("{units}", n(row.unitCount))}
        </span>
        <span className="ml-auto flex items-center gap-3">
          <Tag color={STATUS_COLOR[row.status]} className="m-0">
            {statusLabel[row.status]}
          </Tag>
          <span className="text-xs text-muted-foreground">{dateLine(row)}</span>
          <RightOutlined className="text-xs text-muted-foreground" aria-hidden="true" />
        </span>
      </button>
    </li>
  );

  const detailContent = (row: TransferListItem) => {
    const items = row.items ?? [];
    const timeline: { label: string; done: boolean }[] = [
      { label: t.branches.dateCreated.replace("{date}", formatDateTime(row.createdAt, lang)), done: true },
      ...(row.sentAt ? [{ label: t.branches.dateSent.replace("{date}", formatDateTime(row.sentAt, lang)), done: true }] : []),
      ...(row.status === "received" && row.receivedAt
        ? [{ label: t.branches.dateReceived.replace("{date}", formatDateTime(row.receivedAt, lang)), done: true }]
        : []),
      ...(row.status === "cancelled" ? [{ label: t.branches.statusCancelled, done: false }] : []),
    ];
    return (
      <div className="space-y-5">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Tag color={STATUS_COLOR[row.status]} className="m-0">
              {statusLabel[row.status]}
            </Tag>
            <span className="text-xs text-muted-foreground">
              {t.branches.transferSummary.replace("{items}", n(row.itemCount)).replace("{units}", n(row.unitCount))}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-sm font-medium text-foreground">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              {row.fromBranchName}
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-sm font-medium text-foreground">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              {row.toBranchName}
            </span>
          </div>
        </div>

        <section className="space-y-2">
          <h3 className="m-0 text-sm font-semibold text-foreground">{t.branches.timelineHeading}</h3>
          <ol className="m-0 list-none space-y-1.5 p-0">
            {timeline.map((entry) => (
              <li key={entry.label} className="flex items-center gap-2 text-sm text-foreground">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${entry.done ? "bg-emerald-500" : "bg-rose-400"}`}
                  aria-hidden="true"
                />
                {entry.label}
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-2">
          <h3 className="m-0 text-sm font-semibold text-foreground">{t.branches.itemsHeading}</h3>
          <ul className="m-0 list-none divide-y divide-border rounded-xl border border-border p-0">
            {items.map((item) => (
              <li
                key={item.id}
                className={`flex items-center gap-3 px-3 py-2.5 ${item.receivedAt ? "bg-emerald-50/60 dark:bg-emerald-500/5" : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="wrap-break-word text-sm font-medium text-foreground">{item.productName}</div>
                  {item.variantName && <div className="text-xs text-muted-foreground">{item.variantName}</div>}
                </div>
                <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-foreground">
                  × {n(item.quantity)}
                </span>
                {item.receivedAt ? (
                  <Tooltip title={formatDateTime(item.receivedAt, lang)}>
                    <Tag color="green" icon={<CheckCircleOutlined />} className="m-0">
                      {t.branches.itemReceived}
                    </Tag>
                  </Tooltip>
                ) : row.status === "cancelled" ? (
                  <Tag className="m-0">{t.branches.itemNotMoved}</Tag>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        {row.note && (
          <section className="space-y-1">
            <h3 className="m-0 text-sm font-semibold text-foreground">{t.branches.noteLabel}</h3>
            <p className="m-0 whitespace-pre-wrap text-sm text-muted-foreground">{row.note}</p>
          </section>
        )}
      </div>
    );
  };

  /** The line under the number: when it was last sent / received / made. */
  const dateLine = (row: TransferListItem) => {
    if (row.status === "received" && row.receivedAt) {
      return t.branches.dateReceived.replace("{date}", formatDateTime(row.receivedAt, lang));
    }
    if (row.status === "sent" && row.sentAt) {
      return t.branches.dateSent.replace("{date}", formatDateTime(row.sentAt, lang));
    }
    return t.branches.dateCreated.replace("{date}", formatDateTime(row.createdAt, lang));
  };

  const renderCard = (row: TransferListItem) => {
    const items = row.items ?? [];
    const busy = busyId === row.id;
    const canSend = row.status === "draft" && can("transfers.send") && canUse(row.fromBranchId);
    const canReceive = row.status === "sent" && can("transfers.receive") && canUse(row.toBranchId);
    const canRemove =
      (row.status === "draft" || row.status === "sent") && can("transfers.delete") && canUse(row.fromBranchId);

    // Lines already received can't be received again or removed.
    const pendingItems = items.filter((i) => !i.receivedAt);
    const receivedCount = items.length - pendingItems.length;
    const picked = (selectedItems[row.id] ?? []).filter((id) => pendingItems.some((i) => i.id === id));
    const canSelect = (canRemove || canReceive) && pendingItems.length > 1;
    const clearPicked = () => setSelectedItems((prev) => ({ ...prev, [row.id]: [] }));

    // A few lines show at first; the page scrolls, not the card.
    const previewCount = 5;
    const expanded = !!expandedRows[row.id];
    const canCollapse = items.length > previewCount;
    const visibleItems = expanded || !canCollapse ? items : items.slice(0, previewCount);

    const showProgress = row.status === "sent" && items.length > 0;
    const progressPct = items.length > 0 ? Math.round((receivedCount / items.length) * 100) : 0;

    const receiveAllLabel =
      items.length === 0
        ? t.branches.receive
        : (receivedCount > 0 ? t.branches.receiveRemaining : t.branches.receiveAllItems).replace(
            "{count}",
            n(pendingItems.length),
          );

    return (
      <li key={row.id} className="relative overflow-hidden rounded-xl border border-border bg-card">
        <span className={`absolute inset-y-0 left-0 w-1 ${STATUS_BAR[row.status]}`} aria-hidden="true" />
        <div className="space-y-3 p-4 pl-5">
          {/* Who, where, when — and what you can do about it. */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span className="font-mono text-sm font-bold text-foreground">{row.transferNumber}</span>
                <Tag color={STATUS_COLOR[row.status]} className="m-0">
                  {statusLabel[row.status]}
                </Tag>
                <span className="text-xs text-muted-foreground">{dateLine(row)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-sm font-medium text-foreground">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  {row.fromBranchName}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-sm font-medium text-foreground">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  {row.toBranchName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t.branches.transferSummary.replace("{items}", n(row.itemCount)).replace("{units}", n(row.unitCount))}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              {canSend && (
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={busy}
                  onClick={() => act(row, sendTransfer, t.branches.toastTransferSent)}
                >
                  {t.branches.send}
                </Button>
              )}
              {canReceive && (
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  loading={busy}
                  onClick={() => act(row, receiveTransfer, t.branches.toastTransferReceived)}
                >
                  {receiveAllLabel}
                </Button>
              )}
              {canRemove && (
                <Button danger disabled={busy} onClick={() => confirmCancel(row)}>
                  {t.branches.cancelTransfer}
                </Button>
              )}
            </div>
          </div>

          {showProgress && (
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">
                  {t.branches.transferProgress.replace("{done}", n(receivedCount)).replace("{total}", n(items.length))}
                </span>
                <span className="tabular-nums text-muted-foreground">{n(progressPct)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          )}

          {items.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-border">
              {canSelect && (
                <div
                  className={`flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2 ${
                    picked.length > 0 ? "bg-primary/10" : "bg-muted/40"
                  }`}
                >
                  <Checkbox
                    checked={picked.length === pendingItems.length}
                    indeterminate={picked.length > 0 && picked.length < pendingItems.length}
                    disabled={busy}
                    onChange={(e) =>
                      setSelectedItems((prev) => ({
                        ...prev,
                        [row.id]: e.target.checked ? pendingItems.map((i) => i.id) : [],
                      }))
                    }
                  >
                    <span className="text-xs font-medium text-foreground">
                      {picked.length > 0
                        ? t.branches.itemsSelected.replace("{count}", n(picked.length))
                        : t.branches.selectAllItems}
                    </span>
                  </Checkbox>
                  {picked.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {canReceive && (
                        <Button
                          size="small"
                          type="primary"
                          icon={<CheckOutlined />}
                          loading={busy}
                          onClick={() => confirmReceiveSelected(row, picked)}
                        >
                          {t.branches.receiveSelectedItems.replace("{count}", n(picked.length))}
                        </Button>
                      )}
                      {canRemove && (
                        <Button
                          size="small"
                          danger
                          icon={<CloseOutlined />}
                          loading={busy}
                          onClick={() => confirmCancelSelected(row, picked)}
                        >
                          {t.branches.cancelSelectedItems.replace("{count}", n(picked.length))}
                        </Button>
                      )}
                      <Button size="small" type="text" onClick={clearPicked}>
                        {t.branches.clearSelection}
                      </Button>
                    </div>
                  ) : (
                    <span className="hidden text-xs text-muted-foreground sm:inline">{t.branches.selectItemsHint}</span>
                  )}
                </div>
              )}

              {visibleItems.length > 0 && (
                <ul className="m-0 list-none divide-y divide-border p-0">
                  {visibleItems.map((item) => {
                    const isPicked = picked.includes(item.id);
                    return (
                      <li
                        key={item.id}
                        className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                          isPicked ? "bg-primary/5" : item.receivedAt ? "bg-emerald-50/60 dark:bg-emerald-500/5" : ""
                        }`}
                      >
                        {canSelect && (
                          <span className="w-4 shrink-0">
                            {!item.receivedAt && (
                              <Checkbox
                                checked={isPicked}
                                disabled={busy}
                                onChange={(e) => toggleItem(row.id, item.id, e.target.checked)}
                              />
                            )}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="wrap-break-word text-sm font-medium text-foreground">{item.productName}</div>
                          {item.variantName && <div className="text-xs text-muted-foreground">{item.variantName}</div>}
                        </div>
                        <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-foreground">
                          × {n(item.quantity)}
                        </span>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {item.receivedAt ? (
                            <Tooltip title={formatDateTime(item.receivedAt, lang)}>
                              <Tag color="green" icon={<CheckCircleOutlined />} className="m-0">
                                {t.branches.itemReceived}
                              </Tag>
                            </Tooltip>
                          ) : (
                            <>
                              {canReceive && (
                                <Button
                                  size="small"
                                  icon={<CheckOutlined />}
                                  className="border-emerald-300! text-emerald-700! dark:text-emerald-400!"
                                  aria-label={t.branches.receiveItem}
                                  disabled={busy}
                                  onClick={() => receiveLines(row, [item.id])}
                                >
                                  <span className="hidden sm:inline">{t.branches.receiveItem}</span>
                                </Button>
                              )}
                              {canRemove && (
                                <Button
                                  size="small"
                                  type="text"
                                  danger
                                  icon={<CloseOutlined />}
                                  aria-label={t.branches.cancelTransferItem}
                                  disabled={busy}
                                  onClick={() => confirmCancelItem(row, item)}
                                >
                                  <span className="hidden sm:inline">{t.branches.cancelTransferItem}</span>
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {canCollapse && (
                <button
                  type="button"
                  onClick={() => setExpandedRows((prev) => ({ ...prev, [row.id]: !expanded }))}
                  className="flex w-full items-center justify-center gap-1.5 border-t border-border px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-muted/60"
                >
                  {expanded ? <UpOutlined /> : <DownOutlined />}
                  {expanded
                    ? t.branches.showLessItems
                    : t.branches.showAllItems.replace("{count}", n(items.length))}
                </button>
              )}
            </div>
          )}

          {row.note && <p className="m-0 text-xs text-muted-foreground">{row.note}</p>}
        </div>
      </li>
    );
  };

  return (
    <div className="px-4 sm:px-8 py-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-sky-400 to-indigo-600 flex items-center justify-center">
            <ArrowLeftRight size={20} color="white" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground m-0">
              <MenuLabel labelKey="menuStockTransfers" />
            </h1>
            <p className="text-xs text-muted-foreground m-0">{t.branches.transfersSubtitle}</p>
          </div>
        </div>
        {can("transfers.add") && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={branches.filter((b) => b.isActive).length < 2}
            title={branches.filter((b) => b.isActive).length < 2 ? t.branches.needTwoBranches : undefined}
            onClick={() => setDrawerOpen(true)}
          >
            {t.branches.newTransfer}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          value={view}
          onChange={(v) => {
            setPage(1);
            setView(v as "active" | "history");
          }}
          options={[
            { value: "active", label: t.branches.tabActive },
            { value: "history", label: t.branches.tabHistory },
          ]}
        />
        {view === "history" && (
          <>
            <Segmented
              size="small"
              value={historyFilter}
              onChange={(v) => {
                setPage(1);
                setHistoryFilter(v as "all" | "received" | "cancelled");
              }}
              options={[
                { value: "all", label: t.branches.statusAll },
                { value: "received", label: t.branches.statusReceived },
                { value: "cancelled", label: t.branches.statusCancelled },
              ]}
            />
            <Input.Search
              allowClear
              className="w-full sm:w-64"
              placeholder={t.branches.searchTransfers}
              onSearch={(value) => {
                setPage(1);
                setSearch(value.trim());
              }}
            />
          </>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spin />
        </div>
      ) : rows.length === 0 ? (
        <Empty className="py-10" description={view === "active" ? t.branches.noActiveTransfers : t.branches.noTransfers}>
          {can("transfers.add") && branches.filter((b) => b.isActive).length >= 2 && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawerOpen(true)}>
              {t.branches.newTransfer}
            </Button>
          )}
        </Empty>
      ) : (
        <ul className="m-0 p-0 list-none space-y-3">{rows.map(view === "active" ? renderCard : renderHistoryRow)}</ul>
      )}

      {total > PAGE_SIZE && (
        <div className="flex justify-end">
          <Pagination current={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} showSizeChanger={false} size="small" />
        </div>
      )}

      <Drawer
        open={!!detail}
        onClose={() => setDetail(null)}
        size={screens.md ? 520 : "100%"}
        title={detail ? `${t.branches.transferDetails} · ${detail.transferNumber}` : ""}
        destroyOnHidden
      >
        {detail && detailContent(detail)}
      </Drawer>

      <TransferDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreated={() => {
          setPage(1);
          load();
          refreshBranches();
        }}
      />
    </div>
  );
}
