"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import { Checkbox, Empty, Input, InputNumber, Popconfirm, Select, Spin, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ClipboardList, Copy, Download, MessageCircle, Plus, Printer, ReceiptText, Search, X } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { useStockInsights } from "@/lib/hook/stock/useStockInsights";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { useBranches } from "@/lib/context/BranchContext";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useInvoiceData } from "@/lib/hook/useInvoiceData";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { usePermissions } from "@/lib/context/PermissionsContext";
import { assignSupplierToProducts, getProductSupplierMap, getSuppliers } from "@/lib/queries/supplier/suppliers";
import { addSupplierEntry } from "@/lib/queries/supplier/supplierLedger";
import { whatsappNumber, type Supplier } from "@/lib/queries/supplier/supplierTypes";
import { findReorderItems, type ReorderItemInfo } from "@/lib/queries/stock/findReorderItems";
import { reorderItemKey, useReorderListStore, type ManualReorderItem } from "@/lib/store/reorderListStore";
import { printOrderList } from "@/lib/utils/printOrderList";
import type { StockInsightRow } from "@/lib/queries/stock/stockInsightTypes";
import { StockHealthBadge } from "@/app/components/admin/dashboard/products/stock/StockHealthBadge";

const COVER_DAY_OPTIONS = [14, 30, 45, 60] as const;
/** Group key for lines whose product has no supplier. */
const NONE = "none";
const EMPTY_MANUAL: readonly ManualReorderItem[] = [];

interface ReorderRow extends StockInsightRow {
  /** Units the sales pace says to buy to cover the chosen days (0 for an item added by hand that isn't selling). */
  suggested: number;
  /** The owner put this on the list themselves. */
  manual: boolean;
}

/** Quotes a CSV cell. */
function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(filename: string, lines: string[]): void {
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const keyOf = (row: { productId: string; variantId: string | null }) => reorderItemKey(row.productId, row.variantId);

/**
 * Reorder List: what to buy, how many and about what it costs, split by
 * supplier so each importer gets only their own list. It starts from what is
 * sold out or about to run out, and the owner can add any other product by
 * hand (one or many). Quantities and each line's supplier can be changed
 * before sending.
 */
export default function ReorderListPage() {
  const t = useTranslation();
  const n = useLocalNum();
  const notify = useSheiNotification();
  const { storeId } = useCurrentUser();
  const { can } = usePermissions();
  const canAssign = can("stock.edit");
  const canMoney = can("stock.supplier_money");
  const { storeData } = useInvoiceData({ storeId: storeId ?? undefined });
  const { data, loading, error } = useStockInsights();
  const { icon: currencyIconRaw } = useUserCurrencyIcon();
  const symbol = typeof currencyIconRaw === "string" ? currencyIconRaw : "৳";
  const { enabled: branchesOn, selectedBranch, selectedBranchId } = useBranches();
  const branchId = branchesOn ? selectedBranchId : null;
  const branchLabel = branchesOn ? (selectedBranch?.name ?? t.branches.allBranches) : null;

  const [coverDays, setCoverDays] = useState<number>(30);
  // Quantities the owner changed by hand, and suppliers chosen for this order only, keyed by SKU.
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [lineSupplier, setLineSupplier] = useState<Record<string, string>>({});

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierByProduct, setSupplierByProduct] = useState<Record<string, string>>({});
  const loadSuppliers = useCallback(async () => {
    if (!storeId) return;
    const [list, map] = await Promise.all([getSuppliers(storeId), getProductSupplierMap(storeId)]);
    setSuppliers(list);
    setSupplierByProduct(map);
  }, [storeId]);
  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  // Items added by hand (saved in this browser).
  const manual = useReorderListStore((s) => (storeId ? s.itemsByStore[storeId] : undefined)) ?? EMPTY_MANUAL;
  const addItems = useReorderListStore((s) => s.addItems);
  const setManualQuantity = useReorderListStore((s) => s.setQuantity);
  const removeManual = useReorderListStore((s) => s.remove);
  const clearManual = useReorderListStore((s) => s.clear);
  const manualByKey = useMemo(() => new Map(manual.map((i) => [i.key, i])), [manual]);

  const insightByKey = useMemo(() => new Map((data?.rows ?? []).map((r) => [keyOf(r), r])), [data]);

  // Items added by hand that the sales data doesn't cover (out of stock and not selling) need looking up.
  const [infoByKey, setInfoByKey] = useState<Record<string, ReorderItemInfo>>({});
  const missingKeys = useMemo(
    () => manual.filter((i) => data && !insightByKey.has(i.key) && !infoByKey[i.key]).map((i) => i.key),
    [manual, data, insightByKey, infoByKey],
  );
  const missingSignature = missingKeys.join("|");
  useEffect(() => {
    if (!storeId || missingKeys.length === 0) return;
    let stale = false;
    findReorderItems(storeId, { keys: missingKeys }, branchId).then((items) => {
      if (stale) return;
      setInfoByKey((prev) => {
        const next = { ...prev };
        for (const item of items) next[keyOf(item)] = item;
        return next;
      });
    });
    return () => {
      stale = true;
    };
    // missingSignature stands for missingKeys.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, missingSignature, branchId]);

  // Search for products to add.
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ReorderItemInfo[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  useEffect(() => {
    const text = query.trim();
    if (!storeId || text.length < 2) {
      setResults([]);
      return;
    }
    let stale = false;
    setSearching(true);
    const timer = setTimeout(() => {
      findReorderItems(storeId, { query: text }, branchId)
        .then((items) => {
          if (!stale) setResults(items);
        })
        .finally(() => {
          if (!stale) setSearching(false);
        });
    }, 300);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [query, storeId, branchId]);

  const money = (amount: number) => `${symbol}${n(Math.round(amount).toLocaleString())}`;

  const rows = useMemo<ReorderRow[]>(() => {
    if (!data) return [];
    const list: ReorderRow[] = [];
    const seen = new Set<string>();
    for (const row of data.rows) {
      const key = keyOf(row);
      const suggested = Math.max(Math.ceil((row.sold30 / 30) * coverDays) - row.stock, 0);
      const isManual = manualByKey.has(key);
      const needed = row.sold30 > 0 && (row.health === "restock" || row.stock <= row.lowStockThreshold) && suggested > 0;
      if (!needed && !isManual) continue;
      seen.add(key);
      list.push({ ...row, suggested, manual: isManual });
    }
    for (const item of manual) {
      if (seen.has(item.key)) continue;
      const info = infoByKey[item.key];
      if (!info) continue;
      list.push({
        productId: info.productId,
        variantId: info.variantId,
        name: info.name,
        sku: info.sku,
        categoryName: null,
        stock: info.stock,
        lowStockThreshold: info.lowStockThreshold,
        sold30: 0,
        sold90: 0,
        lastSoldDate: null,
        lastAddedDate: null,
        daysLeft: null,
        unitCost: info.unitCost,
        valueTp: info.stock * info.unitCost,
        health: "healthy",
        suggested: 0,
        manual: true,
      });
    }
    // Selling items first (soonest to run out on top), then items added by hand that aren't selling.
    return list.sort(
      (a, b) =>
        Number(a.sold30 <= 0) - Number(b.sold30 <= 0) ||
        (a.daysLeft ?? 0) - (b.daysLeft ?? 0) ||
        b.sold30 - a.sold30,
    );
  }, [data, coverDays, manual, manualByKey, infoByKey]);

  const supplierById = useMemo(() => new Map(suppliers.map((s) => [s.id, s])), [suppliers]);
  const defaultSupplierOf = (row: StockInsightRow) => supplierByProduct[row.productId] ?? NONE;
  const supplierOf = (row: StockInsightRow) => lineSupplier[keyOf(row)] ?? defaultSupplierOf(row);
  const quantityOf = (row: ReorderRow) => {
    const key = keyOf(row);
    if (overrides[key] !== undefined) return overrides[key];
    if (row.manual) return manualByKey.get(key)?.quantity ?? Math.max(row.suggested, 1);
    return row.suggested;
  };
  const costOf = (row: ReorderRow) => quantityOf(row) * row.unitCost;

  const groups = useMemo(() => {
    const byKey = new Map<string, ReorderRow[]>();
    for (const row of rows) {
      const key = supplierOf(row);
      // A deleted supplier's id falls back to "no supplier".
      const safeKey = key !== NONE && !supplierById.has(key) ? NONE : key;
      byKey.set(safeKey, [...(byKey.get(safeKey) ?? []), row]);
    }
    const named = suppliers
      .filter((s) => byKey.has(s.id))
      .map((s) => ({ key: s.id, supplier: s as Supplier | null, rows: byKey.get(s.id) ?? [] }));
    const none = byKey.get(NONE);
    return none ? [...named, { key: NONE, supplier: null as Supplier | null, rows: none }] : named;
    // supplierOf reads lineSupplier / supplierByProduct, so list them explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, suppliers, supplierById, lineSupplier, supplierByProduct, overrides, manualByKey]);

  const orderRowsOf = (list: ReorderRow[]) => list.filter((row) => quantityOf(row) > 0);
  const totalOf = (list: ReorderRow[]) => orderRowsOf(list).reduce((sum, row) => sum + costOf(row), 0);
  const allOrderRows = groups.flatMap((g) => orderRowsOf(g.rows));
  const grandTotal = allOrderRows.reduce((sum, row) => sum + costOf(row), 0);

  const setQuantity = (row: ReorderRow, value: number) => {
    const key = keyOf(row);
    setOverrides((prev) => ({ ...prev, [key]: value }));
    // An item added by hand remembers its quantity.
    if (row.manual && storeId) setManualQuantity(storeId, key, value);
  };

  const removeRow = (row: ReorderRow) => {
    if (!storeId) return;
    const key = keyOf(row);
    removeManual(storeId, key);
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const addPicked = (items: ReorderItemInfo[]) => {
    if (!storeId || items.length === 0) return;
    const added = addItems(storeId, items.map((i) => ({ productId: i.productId, variantId: i.variantId })));
    // The lookup already has what the list needs to show these.
    setInfoByKey((prev) => {
      const next = { ...prev };
      for (const item of items) next[keyOf(item)] = item;
      return next;
    });
    setPicked(new Set());
    notify.success(t.admin.roAddedCount.replace("{n}", n(added)));
  };

  const listText = (supplier: Supplier | null, list: ReorderRow[]) => {
    const lines = orderRowsOf(list).map((row) => `• ${row.name}${row.sku ? ` (${row.sku})` : ""}: ${quantityOf(row)}`);
    const who = supplier ? ` — ${supplier.name}` : "";
    const from = storeData?.store_name ? ` (${storeData.store_name}${branchLabel ? `, ${branchLabel}` : ""})` : "";
    return [
      `${t.admin.roWhatsappHeader}${who}${from}`,
      ...lines,
      "",
      `${t.admin.roTotalCost}: ${money(totalOf(list))}`,
    ].join("\n");
  };

  const copyGroup = async (supplier: Supplier | null, list: ReorderRow[]) => {
    try {
      await navigator.clipboard.writeText(listText(supplier, list));
      notify.success(t.admin.roCopied);
    } catch {
      notify.error(t.admin.shLoadFailed);
    }
  };

  const csvLines = (supplier: Supplier | null, list: ReorderRow[]) =>
    orderRowsOf(list).map((row) =>
      [
        supplier?.name ?? "",
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
  const CSV_HEADER = ["Supplier", "Item", "SKU", "In stock", "Sold 30 days", "Days left", "Order", "Unit cost", "Est. cost"].join(",");

  const csvForGroup = (supplier: Supplier | null, list: ReorderRow[]) => {
    const safe = (supplier?.name ?? "no-supplier").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    downloadCsv(`reorder-${safe || "supplier"}.csv`, [CSV_HEADER, ...csvLines(supplier, list)]);
  };

  const csvForAll = () =>
    downloadCsv("reorder-list.csv", [CSV_HEADER, ...groups.flatMap((g) => csvLines(g.supplier, g.rows))]);

  const printGroup = (supplier: Supplier | null, list: ReorderRow[]) => {
    const ok = printOrderList({
      storeName: storeData?.store_name ?? "",
      supplierName: supplier?.name ?? "",
      supplierPhone: supplier?.phone ?? null,
      dateLabel: dayjs().format("DD-MM-YYYY"),
      currency: symbol,
      title: t.admin.roTitle,
      headers: {
        item: t.admin.shColItem,
        sku: "SKU",
        stock: t.admin.shColStock,
        order: t.admin.roColOrder,
        unitCost: t.admin.roUnitCost,
        cost: t.admin.roColCost,
      },
      totalLabel: t.admin.roTotalCost,
      rows: orderRowsOf(list).map((row) => ({
        name: row.name,
        sku: row.sku,
        stock: row.stock,
        order: quantityOf(row),
        unitCost: row.unitCost,
        cost: costOf(row),
      })),
      total: totalOf(list),
    });
    if (!ok) notify.error(t.admin.roPopupBlocked);
  };

  const makeDefault = async (row: ReorderRow) => {
    if (!storeId) return;
    const chosen = supplierOf(row);
    const result = await assignSupplierToProducts(storeId, [row.productId], chosen === NONE ? null : chosen);
    if (!result.success) {
      notify.error(result.error ?? t.admin.spAssignFailed);
      return;
    }
    notify.success(t.admin.roMadeDefault);
    setLineSupplier((prev) => {
      const next = { ...prev };
      delete next[keyOf(row)];
      return next;
    });
    await loadSuppliers();
  };

  const saveAsBill = async (supplier: Supplier, list: ReorderRow[]) => {
    if (!storeId) return;
    const amount = Math.round(totalOf(list) * 100) / 100;
    if (amount <= 0) return;
    const result = await addSupplierEntry(storeId, {
      supplierId: supplier.id,
      kind: "bill",
      amount,
      date: dayjs().format("YYYY-MM-DD"),
      note: t.admin.roWhatsappHeader,
    });
    if (!result.success) {
      notify.error(result.error ?? t.admin.spFailed);
      return;
    }
    notify.success(t.admin.slBillSaved);
  };

  const columns: ColumnsType<ReorderRow> = [
    {
      title: t.admin.shColItem,
      key: "item",
      render: (_v, row) => (
        <div className="min-w-40">
          <div className="flex items-start gap-1.5">
            <span className="text-sm font-medium text-foreground">{row.name}</span>
            {row.manual && (
              <button
                type="button"
                onClick={() => removeRow(row)}
                aria-label={t.admin.roRemove}
                title={t.admin.roRemove}
                className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground hover:text-rose-600 hover:bg-muted transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            {row.sku && <span className="text-[11px] font-mono text-muted-foreground">{row.sku}</span>}
            {row.sold30 > 0 && <StockHealthBadge health={row.health} />}
            {row.manual && (
              <span className="inline-flex items-center rounded-md bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
                {t.admin.roAddedByYou}
              </span>
            )}
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
        <InputNumber min={0} value={quantityOf(row)} onChange={(v) => setQuantity(row, Number(v ?? 0))} className="w-20" />
      ),
    },
    {
      title: t.admin.roSupplier,
      key: "supplier",
      render: (_v, row) => {
        const chosen = supplierById.has(supplierOf(row)) ? supplierOf(row) : NONE;
        const changed = chosen !== (supplierById.has(defaultSupplierOf(row)) ? defaultSupplierOf(row) : NONE);
        return (
          <div className="min-w-36 space-y-1">
            <Select
              size="small"
              value={chosen}
              onChange={(value) => setLineSupplier((prev) => ({ ...prev, [keyOf(row)]: value }))}
              className="w-full"
              options={[
                { value: NONE, label: t.admin.spNoSupplier },
                ...suppliers.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
            {changed && canAssign && (
              <button
                type="button"
                onClick={() => makeDefault(row)}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {t.admin.roMakeDefault}
              </button>
            )}
          </div>
        );
      },
    },
    {
      title: t.admin.roColCost,
      key: "cost",
      align: "right",
      render: (_v, row) => <span className="tabular-nums">{money(costOf(row))}</span>,
    },
  ];

  const actionButton =
    "inline-flex items-center gap-1.5 rounded-xl h-8 px-2.5 border border-border bg-card text-xs font-medium text-foreground hover:bg-muted transition-colors";
  const inList = (item: ReorderItemInfo) => rows.some((r) => keyOf(r) === keyOf(item));
  const pickedItems = results.filter((r) => picked.has(keyOf(r)) && !inList(r));

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
        ) : (
          <>
            {/* Add products by hand — one or many */}
            <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-foreground m-0">{t.admin.roAddPanelTitle}</h2>
                  <p className="text-xs text-muted-foreground m-0 mt-0.5">{t.admin.roAddPanelSub}</p>
                </div>
                {manual.length > 0 && storeId && (
                  <Popconfirm
                    title={t.admin.roClearAddedConfirm}
                    okText={t.admin.roClearAdded}
                    cancelText={t.admin.spCancel}
                    onConfirm={() => {
                      clearManual(storeId);
                      setOverrides({});
                    }}
                  >
                    <button type="button" className="text-xs font-semibold text-rose-600 hover:underline">
                      {t.admin.roClearAdded} ({n(manual.length)})
                    </button>
                  </Popconfirm>
                )}
              </div>

              <div className="relative sm:max-w-md">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.admin.roSearchProducts}
                  className="pl-9!"
                  allowClear
                />
              </div>

              {query.trim().length >= 2 && (
                <div className="rounded-xl border border-border">
                  {searching && results.length === 0 ? (
                    <div className="flex justify-center py-4">
                      <Spin size="small" />
                    </div>
                  ) : results.length === 0 ? (
                    <p className="m-0 py-4 text-center text-sm text-muted-foreground">{t.admin.roNoResults}</p>
                  ) : (
                    <>
                      <ul className="m-0 p-0 list-none divide-y divide-border max-h-72 overflow-y-auto">
                        {results.map((item) => {
                          const key = keyOf(item);
                          const already = inList(item);
                          return (
                            <li key={key} className="flex items-center gap-3 px-3 py-2">
                              <Checkbox
                                disabled={already}
                                checked={picked.has(key)}
                                onChange={(e) =>
                                  setPicked((prev) => {
                                    const next = new Set(prev);
                                    if (e.target.checked) next.add(key);
                                    else next.delete(key);
                                    return next;
                                  })
                                }
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-foreground truncate">{item.name}</div>
                                <div className="text-[11px] text-muted-foreground">
                                  {item.sku ? `${item.sku} · ` : ""}
                                  {t.admin.shColStock}: {n(item.stock)}
                                </div>
                              </div>
                              {already ? (
                                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{t.admin.roInList}</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => addPicked([item])}
                                  className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                                >
                                  <Plus size={12} aria-hidden="true" />
                                  {t.admin.roAdd}
                                </button>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                      {pickedItems.length > 0 && (
                        <div className="border-t border-border p-2 text-right">
                          <button
                            type="button"
                            onClick={() => addPicked(pickedItems)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                          >
                            <Plus size={13} aria-hidden="true" />
                            {t.admin.roAddSelected.replace("{n}", n(pickedItems.length))}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </section>

            {rows.length === 0 ? (
              <Empty description={t.admin.roEmpty}>
                <p className="text-xs text-muted-foreground m-0">{t.admin.roEmptySub}</p>
              </Empty>
            ) : (
              <>
                <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-foreground">
                      {t.admin.roItems.replace("{n}", n(allOrderRows.length))}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t.admin.roTotalCost}: <span className="font-bold text-foreground tabular-nums">{money(grandTotal)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {suppliers.length === 0 && (
                      <Link href="/dashboard/stock/suppliers" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                        {t.admin.roAddSuppliersHint}
                      </Link>
                    )}
                    <button type="button" onClick={csvForAll} className={actionButton}>
                      <Download size={14} aria-hidden="true" />
                      {t.admin.roCsvAll}
                    </button>
                  </div>
                </div>

                {groups.map((group) => {
                  const wa = whatsappNumber(group.supplier?.phone);
                  const text = listText(group.supplier, group.rows);
                  const waHref = `https://wa.me/${wa ?? ""}?text=${encodeURIComponent(text)}`;
                  const groupTotal = totalOf(group.rows);
                  return (
                    <section key={group.key} className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="text-sm font-bold text-foreground m-0">
                            {group.supplier ? group.supplier.name : t.admin.spNoSupplier}
                          </h2>
                          <p className="text-xs text-muted-foreground m-0 mt-0.5">
                            {t.admin.roItemsShort.replace("{n}", n(orderRowsOf(group.rows).length))} ·{" "}
                            <span className="font-semibold text-foreground tabular-nums">{money(groupTotal)}</span>
                            {group.supplier?.phone ? ` · ${group.supplier.phone}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={waHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl h-8 px-2.5 bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                          >
                            <MessageCircle size={14} aria-hidden="true" />
                            WhatsApp
                          </a>
                          <button type="button" onClick={() => copyGroup(group.supplier, group.rows)} className={actionButton}>
                            <Copy size={14} aria-hidden="true" />
                            {t.admin.roCopy}
                          </button>
                          <button type="button" onClick={() => csvForGroup(group.supplier, group.rows)} className={actionButton}>
                            <Download size={14} aria-hidden="true" />
                            CSV
                          </button>
                          <button type="button" onClick={() => printGroup(group.supplier, group.rows)} className={actionButton}>
                            <Printer size={14} aria-hidden="true" />
                            {t.admin.roPrint}
                          </button>
                          {canMoney && group.supplier && groupTotal > 0 && (
                            <Popconfirm
                              title={t.admin.slBillConfirm}
                              okText={t.admin.slSaveAsBill}
                              cancelText={t.admin.spCancel}
                              onConfirm={() => group.supplier && saveAsBill(group.supplier, group.rows)}
                            >
                              <button type="button" className={actionButton}>
                                <ReceiptText size={14} aria-hidden="true" />
                                {t.admin.slSaveAsBill}
                              </button>
                            </Popconfirm>
                          )}
                        </div>
                      </div>
                      <Table<ReorderRow>
                        columns={columns}
                        dataSource={group.rows}
                        rowKey={keyOf}
                        size="small"
                        scroll={{ x: 820 }}
                        pagination={{ pageSize: 25, hideOnSinglePage: true, showSizeChanger: false }}
                      />
                    </section>
                  );
                })}
                <p className="m-0 text-[11px] text-muted-foreground">{t.admin.roNote}</p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
