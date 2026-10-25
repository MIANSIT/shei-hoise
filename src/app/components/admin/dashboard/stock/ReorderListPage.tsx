"use client";

import { useMemo, useState } from "react";
import { Empty, InputNumber, Select, Spin, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ClipboardList, Copy, Download, MessageCircle } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { useStockInsights } from "@/lib/hook/stock/useStockInsights";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { useBranches } from "@/lib/context/BranchContext";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import type { StockInsightRow } from "@/lib/queries/stock/stockInsightTypes";
import { StockHealthBadge } from "@/app/components/admin/dashboard/products/stock/StockHealthBadge";

const COVER_DAY_OPTIONS = [14, 30, 45, 60] as const;

interface ReorderRow extends StockInsightRow {
  /** Units the sales pace says to buy to cover the chosen days. */
  suggested: number;
}

/** Quotes a CSV cell. */
function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Reorder List: what to buy, how many and about what it costs. Starts from
 * what is sold out or about to run out and sizes each order to cover the days
 * the owner picks; the quantities can be edited before copying or exporting.
 */
export default function ReorderListPage() {
  const t = useTranslation();
  const n = useLocalNum();
  const notify = useSheiNotification();
  const { data, loading, error } = useStockInsights();
  const { icon: currencyIconRaw } = useUserCurrencyIcon();
  const symbol = typeof currencyIconRaw === "string" ? currencyIconRaw : "৳";
  const { enabled: branchesOn, selectedBranch } = useBranches();
  const branchLabel = branchesOn ? (selectedBranch?.name ?? t.branches.allBranches) : null;

  const [coverDays, setCoverDays] = useState<number>(30);
  // Quantities the owner changed by hand, keyed by SKU.
  const [overrides, setOverrides] = useState<Record<string, number>>({});

  const money = (amount: number) => `${symbol}${n(Math.round(amount).toLocaleString())}`;
  const keyOf = (row: StockInsightRow) => `${row.productId}:${row.variantId ?? ""}`;

  const rows = useMemo<ReorderRow[]>(() => {
    if (!data) return [];
    return data.rows
      .filter((row) => row.sold30 > 0 && (row.health === "restock" || row.stock <= row.lowStockThreshold))
      .map((row) => ({
        ...row,
        suggested: Math.max(Math.ceil((row.sold30 / 30) * coverDays) - row.stock, 0),
      }))
      .filter((row) => row.suggested > 0)
      // Sold out and selling first, then the soonest to run out.
      .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0) || b.sold30 - a.sold30);
  }, [data, coverDays]);

  const quantityOf = (row: ReorderRow) => overrides[keyOf(row)] ?? row.suggested;
  const costOf = (row: ReorderRow) => quantityOf(row) * row.unitCost;
  const orderRows = rows.filter((row) => quantityOf(row) > 0);
  const totalCost = orderRows.reduce((sum, row) => sum + costOf(row), 0);

  const listText = () => {
    const lines = orderRows.map((row) => `• ${row.name}${row.sku ? ` (${row.sku})` : ""}: ${quantityOf(row)}`);
    return [
      `${t.admin.roWhatsappHeader}${branchLabel ? ` — ${branchLabel}` : ""}`,
      ...lines,
      "",
      `${t.admin.roTotalCost}: ${money(totalCost)}`,
    ].join("\n");
  };

  const copyList = async () => {
    try {
      await navigator.clipboard.writeText(listText());
      notify.success(t.admin.roCopied);
    } catch {
      notify.error(t.admin.shLoadFailed);
    }
  };

  const downloadCsv = () => {
    const header = ["Item", "SKU", "In stock", "Sold 30 days", "Days left", "Order", "Unit cost", "Est. cost"];
    const lines = orderRows.map((row) =>
      [
        row.name,
        row.sku ?? "",
        row.stock,
        row.sold30,
        row.daysLeft ?? "",
        quantityOf(row),
        row.unitCost,
        costOf(row),
      ]
        .map(csvCell)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "reorder-list.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const columns: ColumnsType<ReorderRow> = [
    {
      title: t.admin.shColItem,
      key: "item",
      render: (_v, row) => (
        <div className="min-w-40">
          <div className="text-sm font-medium text-foreground">{row.name}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            {row.sku && <span className="text-[11px] font-mono text-muted-foreground">{row.sku}</span>}
            <StockHealthBadge health={row.health} />
          </div>
        </div>
      ),
    },
    {
      title: t.admin.shColStock,
      dataIndex: "stock",
      key: "stock",
      align: "right",
      render: (v: number) => <span className="tabular-nums">{n(v)}</span>,
    },
    {
      title: t.admin.shColSold30,
      dataIndex: "sold30",
      key: "sold30",
      align: "right",
      render: (v: number) => <span className="tabular-nums">{n(v)}</span>,
    },
    {
      title: t.admin.shColDaysLeft,
      dataIndex: "daysLeft",
      key: "daysLeft",
      align: "right",
      render: (v: number | null) => (v === null ? "—" : <span className="tabular-nums">{n(v)}</span>),
    },
    {
      title: t.admin.roColOrder,
      key: "order",
      align: "right",
      render: (_v, row) => (
        <InputNumber
          min={0}
          value={quantityOf(row)}
          onChange={(v) => setOverrides((prev) => ({ ...prev, [keyOf(row)]: Number(v ?? 0) }))}
          className="w-20"
        />
      ),
    },
    {
      title: t.admin.roColCost,
      key: "cost",
      align: "right",
      render: (_v, row) => <span className="tabular-nums">{money(costOf(row))}</span>,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border px-4 sm:px-8 py-4 sm:py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-indigo-400 to-violet-600 flex items-center justify-center shrink-0">
              <ClipboardList size={18} color="white" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-foreground m-0 tracking-tight leading-tight">
                {t.admin.roTitle}
              </h1>
              <p className="text-xs text-muted-foreground m-0">
                {branchLabel && <span className="font-semibold text-indigo-700 dark:text-indigo-300">{branchLabel} · </span>}
                {t.admin.roSub}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">{t.admin.roCoverDays}</span>
            <Select
              value={coverDays}
              onChange={(v) => setCoverDays(v)}
              options={COVER_DAY_OPTIONS.map((d) => ({ value: d, label: t.admin.roDaysOption.replace("{n}", n(d)) }))}
              className="w-40"
            />
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-6 space-y-5">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : error || !data ? (
          <Empty description={error ?? t.admin.shLoadFailed} />
        ) : rows.length === 0 ? (
          <Empty description={t.admin.roEmpty}>
            <p className="text-xs text-muted-foreground m-0">{t.admin.roEmptySub}</p>
          </Empty>
        ) : (
          <>
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-foreground">
                  {t.admin.roItems.replace("{n}", n(orderRows.length))}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t.admin.roTotalCost}: <span className="font-bold text-foreground tabular-nums">{money(totalCost)}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={copyList}
                  className="inline-flex items-center gap-1.5 rounded-xl h-9 px-3 border border-border bg-card text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <Copy size={14} aria-hidden="true" />
                  {t.admin.roCopy}
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(listText())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl h-9 px-3 bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
                >
                  <MessageCircle size={14} aria-hidden="true" />
                  WhatsApp
                </a>
                <button
                  type="button"
                  onClick={downloadCsv}
                  className="inline-flex items-center gap-1.5 rounded-xl h-9 px-3 border border-border bg-card text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <Download size={14} aria-hidden="true" />
                  {t.admin.roCsv}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3">
              <Table<ReorderRow>
                columns={columns}
                dataSource={rows}
                rowKey={keyOf}
                size="small"
                scroll={{ x: 700 }}
                pagination={{ pageSize: 25, hideOnSinglePage: true, showSizeChanger: false }}
              />
              <p className="m-0 text-[11px] text-muted-foreground">{t.admin.roNote}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
