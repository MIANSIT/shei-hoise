"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { App, Button, Checkbox, Empty, Pagination, Segmented, Spin, Tag } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { ArrowLeftRight, ArrowRight } from "lucide-react";
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
  const [status, setStatus] = useState<TransferStatus | "all">("all");
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
    const result = await getTransfers({ page, pageSize: PAGE_SIZE, status: status === "all" ? null : status });
    if (result.ok) {
      setRows(result.rows);
      setTotal(result.total);
    } else {
      notify.error(result.error);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchesOn, page, status]);

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

  const statusLabel: Record<TransferStatus, string> = {
    draft: t.branches.statusDraft,
    sent: t.branches.statusSent,
    received: t.branches.statusReceived,
    cancelled: t.branches.statusCancelled,
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

      <div className="overflow-x-auto">
        <Segmented
          value={status}
          onChange={(v) => {
            setPage(1);
            setStatus(v as TransferStatus | "all");
          }}
          options={[
            { value: "all", label: t.branches.statusAll },
            { value: "draft", label: t.branches.statusDraft },
            { value: "sent", label: t.branches.statusSent },
            { value: "received", label: t.branches.statusReceived },
            { value: "cancelled", label: t.branches.statusCancelled },
          ]}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spin />
        </div>
      ) : rows.length === 0 ? (
        <Empty className="py-10" description={t.branches.noTransfers} />
      ) : (
        <ul className="m-0 p-0 list-none space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-foreground">{row.transferNumber}</span>
                    <Tag color={STATUS_COLOR[row.status]} className="m-0">
                      {statusLabel[row.status]}
                    </Tag>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-sm text-foreground">
                    <span className="font-medium">{row.fromBranchName}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                    <span className="font-medium">{row.toBranchName}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t.branches.transferSummary
                      .replace("{items}", n(row.itemCount))
                      .replace("{units}", n(row.unitCount))}{" "}
                    · {formatDateTime(row.receivedAt ?? row.sentAt ?? row.createdAt, lang)}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {row.status === "draft" && can("transfers.send") && canUse(row.fromBranchId) && (
                    <Button
                      size="small"
                      type="primary"
                      loading={busyId === row.id}
                      onClick={() => act(row, sendTransfer, t.branches.toastTransferSent)}
                    >
                      {t.branches.send}
                    </Button>
                  )}
                  {row.status === "sent" && can("transfers.receive") && canUse(row.toBranchId) && (
                    <Button
                      size="small"
                      type="primary"
                      loading={busyId === row.id}
                      onClick={() => act(row, receiveTransfer, t.branches.toastTransferReceived)}
                    >
                      {t.branches.receive}
                    </Button>
                  )}
                  {(row.status === "draft" || row.status === "sent") &&
                    can("transfers.delete") &&
                    canUse(row.fromBranchId) && (
                      <Button size="small" danger disabled={busyId === row.id} onClick={() => confirmCancel(row)}>
                        {t.branches.cancelTransfer}
                      </Button>
                    )}
                </div>
              </div>

              {row.items && row.items.length > 0 && (() => {
                const canRemove =
                  (row.status === "draft" || row.status === "sent") && can("transfers.delete") && canUse(row.fromBranchId);
                const picked = selectedItems[row.id] ?? [];
                // Long transfers would otherwise make the page endless: live ones
                // show a few lines, finished ones (received/cancelled) none.
                const isLive = row.status === "draft" || row.status === "sent";
                const previewCount = isLive ? 3 : 0;
                const expanded = !!expandedRows[row.id];
                const canCollapse = row.items.length > previewCount;
                const visibleItems = expanded || !canCollapse ? row.items : row.items.slice(0, previewCount);
                const toggle = (
                  <Button
                    size="small"
                    type="link"
                    onClick={() => setExpandedRows((prev) => ({ ...prev, [row.id]: !expanded }))}
                  >
                    {expanded
                      ? t.branches.showLessItems
                      : (previewCount === 0 ? t.branches.showItems : t.branches.showAllItems).replace(
                          "{count}",
                          n(row.items.length),
                        )}
                  </Button>
                );
                return (
                  <>
                    {canRemove && row.items.length > 1 && (
                      <div className="flex flex-wrap items-center gap-3">
                        <Checkbox
                          checked={picked.length === row.items.length}
                          indeterminate={picked.length > 0 && picked.length < row.items.length}
                          disabled={busyId === row.id}
                          onChange={(e) =>
                            setSelectedItems((prev) => ({
                              ...prev,
                              [row.id]: e.target.checked ? (row.items ?? []).map((i) => i.id) : [],
                            }))
                          }
                        />
                        {picked.length > 0 && (
                          <Button
                            size="small"
                            danger
                            loading={busyId === row.id}
                            onClick={() => confirmCancelSelected(row, picked)}
                          >
                            {t.branches.cancelSelectedItems.replace("{count}", n(picked.length))}
                          </Button>
                        )}
                      </div>
                    )}
                    {visibleItems.length > 0 && (
                    <ul className="m-0 p-0 list-none rounded-lg bg-muted/40 divide-y divide-border max-h-72 overflow-y-auto">
                      {visibleItems.map((item) => (
                        <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-1.5 text-sm">
                          <span className="min-w-0 flex items-center gap-2">
                            {canRemove && row.items && row.items.length > 1 && (
                              <Checkbox
                                checked={picked.includes(item.id)}
                                disabled={busyId === row.id}
                                onChange={(e) => toggleItem(row.id, item.id, e.target.checked)}
                              />
                            )}
                            <span className="truncate text-foreground">
                              {item.variantName ? `${item.productName} — ${item.variantName}` : item.productName}
                            </span>
                          </span>
                          <span className="shrink-0 flex items-center gap-2">
                            <span className="font-medium text-foreground">× {n(item.quantity)}</span>
                            {canRemove && (
                              <Button
                                size="small"
                                type="text"
                                danger
                                disabled={busyId === row.id}
                                onClick={() => confirmCancelItem(row, item)}
                              >
                                {t.branches.cancelTransferItem}
                              </Button>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                    )}
                    {canCollapse && <div>{toggle}</div>}
                  </>
                );
              })()}
              {row.note && <p className="m-0 text-xs text-muted-foreground">{row.note}</p>}
            </li>
          ))}
        </ul>
      )}

      {total > PAGE_SIZE && (
        <div className="flex justify-end">
          <Pagination current={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} showSizeChanger={false} size="small" />
        </div>
      )}

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
