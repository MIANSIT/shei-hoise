"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Empty, Spin, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Activity, ClipboardList, Search } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { useStockInsights } from "@/lib/hook/stock/useStockInsights";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { useBranches } from "@/lib/context/BranchContext";
import { formatDate } from "@/lib/utils/formatDate";
import type { StockHealth, StockInsightRow } from "@/lib/queries/stock/stockInsightTypes";
import { StockHealthCard } from "@/app/components/admin/dashboard/products/stock/StockHealthCard";
import { HEALTH_TONE, StockHealthBadge } from "@/app/components/admin/dashboard/products/stock/StockHealthBadge";

type View = "attention" | "all" | StockHealth;

const ATTENTION: readonly StockHealth[] = ["restock", "dead", "slow"];

/**
 * Stock Health: what to restock, what has stopped selling, what sells slowly,
 * and how much money sits on the shelf — by item and by category.
 */
export default function StockHealthPage() {
  const t = useTranslation();
  const n = useLocalNum();
  const { data, loading, error } = useStockInsights();
  const { icon: currencyIconRaw } = useUserCurrencyIcon();
  const symbol = typeof currencyIconRaw === "string" ? currencyIconRaw : "৳";
  const { enabled: branchesOn, selectedBranch } = useBranches();
  const branchLabel = branchesOn ? (selectedBranch?.name ?? t.branches.allBranches) : null;

  const [view, setView] = useState<View>("attention");
  const [search, setSearch] = useState("");

  const money = (amount: number) => `${symbol}${n(Math.round(amount).toLocaleString())}`;

  const rows = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.rows.filter((row) => {
      if (view === "attention" ? !ATTENTION.includes(row.health) : view !== "all" && row.health !== view) return false;
      return !q || row.name.toLowerCase().includes(q) || (row.sku ?? "").toLowerCase().includes(q);
    });
  }, [data, view, search]);

  const categories = useMemo(() => {
    if (!data) return [];
    const byCategory = new Map<string, { value: number; idle: number }>();
    for (const row of data.rows) {
      const key = row.categoryName ?? t.admin.shUncategorised;
      const entry = byCategory.get(key) ?? { value: 0, idle: 0 };
      entry.value += row.valueTp;
      if (row.health === "slow" || row.health === "dead") entry.idle += row.valueTp;
      byCategory.set(key, entry);
    }
    return [...byCategory.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data, t.admin.shUncategorised]);

  const maxCategoryValue = categories[0]?.value ?? 0;

  const columns: ColumnsType<StockInsightRow> = [
    {
      title: t.admin.shColItem,
      key: "item",
      render: (_v, row) => (
        <div className="min-w-40">
          <div className="text-sm font-medium text-foreground">{row.name}</div>
          {row.sku && <div className="text-[11px] font-mono text-muted-foreground">{row.sku}</div>}
        </div>
      ),
    },
    {
      title: t.admin.shColStock,
      dataIndex: "stock",
      key: "stock",
      align: "right",
      sorter: (a, b) => a.stock - b.stock,
      render: (v: number) => <span className="tabular-nums">{n(v)}</span>,
    },
    {
      title: t.admin.shColSold30,
      dataIndex: "sold30",
      key: "sold30",
      align: "right",
      sorter: (a, b) => a.sold30 - b.sold30,
      render: (v: number) => <span className="tabular-nums">{n(v)}</span>,
    },
    {
      title: t.admin.shColSold90,
      dataIndex: "sold90",
      key: "sold90",
      align: "right",
      sorter: (a, b) => a.sold90 - b.sold90,
      render: (v: number) => <span className="tabular-nums">{n(v)}</span>,
    },
    {
      title: t.admin.shColDaysLeft,
      dataIndex: "daysLeft",
      key: "daysLeft",
      align: "right",
      sorter: (a, b) => (a.daysLeft ?? Number.MAX_SAFE_INTEGER) - (b.daysLeft ?? Number.MAX_SAFE_INTEGER),
      render: (v: number | null) => (v === null ? "—" : <span className="tabular-nums">{n(v)}</span>),
    },
    {
      title: t.admin.shColLastSold,
      dataIndex: "lastSoldDate",
      key: "lastSoldDate",
      render: (v: string | null) => (v ? formatDate(v) : t.admin.shNever),
    },
    {
      title: t.admin.shColValue,
      dataIndex: "valueTp",
      key: "valueTp",
      align: "right",
      sorter: (a, b) => a.valueTp - b.valueTp,
      render: (v: number) => <span className="tabular-nums">{money(v)}</span>,
    },
    {
      title: t.admin.shColStatus,
      dataIndex: "health",
      key: "health",
      render: (health: StockHealth) => <StockHealthBadge health={health} />,
    },
  ];

  const pills: { value: View; label: string }[] = [
    { value: "attention", label: t.admin.shAllNeedsAttention },
    { value: "restock", label: t.admin.shHealthRestock },
    { value: "dead", label: t.admin.shHealthDead },
    { value: "slow", label: t.admin.shHealthSlow },
    { value: "healthy", label: t.admin.shHealthHealthy },
    { value: "all", label: t.admin.shShowAll },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border px-4 sm:px-8 py-4 sm:py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-emerald-400 to-teal-600 flex items-center justify-center shrink-0">
              <Activity size={18} color="white" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-foreground m-0 tracking-tight leading-tight">
                {t.admin.shPageTitle}
              </h1>
              <p className="text-xs text-muted-foreground m-0">
                {branchLabel && <span className="font-semibold text-teal-700 dark:text-teal-300">{branchLabel} · </span>}
                {t.admin.shPageSub}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/stock/reorder"
            className="inline-flex items-center gap-1.5 rounded-xl h-9 px-3 bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            <ClipboardList size={14} aria-hidden="true" />
            {t.admin.menuReorderList}
          </Link>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-6 space-y-5">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : error || !data ? (
          <Empty description={error ?? t.admin.shLoadFailed} />
        ) : (
          <>
            <StockHealthCard
              summary={data.summary}
              formatMoney={money}
              activeHealth={view === "attention" || view === "all" || view === "new" ? null : view}
              onSelect={(health) => setView(view === health ? "attention" : health)}
            />

            {categories.length > 0 && (
              <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                <h2 className="text-sm font-bold text-foreground m-0">{t.admin.shByCategory}</h2>
                <p className="text-xs text-muted-foreground m-0 mt-0.5 mb-4">{t.admin.shByCategorySub}</p>
                <ul className="m-0 p-0 list-none space-y-3">
                  {categories.map((c) => (
                    <li key={c.name}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-sm font-medium text-foreground truncate">{c.name}</span>
                        <span className="text-sm font-bold tabular-nums text-foreground whitespace-nowrap">
                          {money(c.value)}
                          {c.idle > 0.5 && (
                            <span className="ml-2 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                              {money(c.idle)} {t.admin.shTiedUp}
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden" aria-hidden="true">
                        <div className="flex h-full" style={{ width: `${(c.value / maxCategoryValue) * 100}%` }}>
                          <div className="h-full bg-emerald-500" style={{ width: `${((c.value - c.idle) / c.value) * 100}%` }} />
                          <div className={`h-full ${HEALTH_TONE.slow.bar}`} style={{ width: `${(c.idle / c.value) * 100}%` }} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-1.5">
                  {pills.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setView(p.value)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        view === p.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-muted-foreground border border-border hover:border-foreground/30"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="relative sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t.admin.shSearchPlaceholder}
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-sm bg-card border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
              </div>

              <Table<StockInsightRow>
                columns={columns}
                dataSource={rows}
                rowKey={(row) => `${row.productId}:${row.variantId ?? ""}`}
                size="small"
                scroll={{ x: 760 }}
                pagination={{ pageSize: 20, hideOnSinglePage: true, showSizeChanger: false }}
                locale={{ emptyText: <Empty description={t.admin.shNothingHere} /> }}
              />
            </section>
          </>
        )}
      </div>
    </div>
  );
}
