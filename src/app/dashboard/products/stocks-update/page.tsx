"use client";
import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button, Pagination, Popover, Select } from "antd";
import { SearchOutlined, LockOutlined } from "@ant-design/icons";
import { Percent, Activity, ClipboardList } from "lucide-react";
import FeatureUpsell from "@/app/components/admin/common/FeatureUpsell";
import StockChangeTable from "@/app/components/admin/dashboard/products/stock/StockChangeTable";
import StockExportButton from "@/app/components/admin/dashboard/products/stock/StockExportButton";
import TraderPriceExportModal from "@/app/components/admin/dashboard/products/trader/TraderPriceExportModal";
import StockStats from "@/app/components/admin/dashboard/products/stock/StockStats";
import { StockHealthCard } from "@/app/components/admin/dashboard/products/stock/StockHealthCard";
import { StockFilter } from "@/lib/types/enums";
import { useUrlSync } from "@/lib/hook/filterWithUrl/useUrlSync";
import MobileFilter from "@/app/components/admin/common/MobileFilter";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useBranches } from "@/lib/context/BranchContext";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useFeatureGate } from "@/lib/hook/useFeatureGate";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { usePermissions } from "@/lib/context/PermissionsContext";
import { useReorderListStore } from "@/lib/store/reorderListStore";
import { getStockInsights } from "@/lib/queries/stock/getStockInsights";
import { getProductSupplierMap, getSuppliers } from "@/lib/queries/supplier/suppliers";
import type { Supplier } from "@/lib/queries/supplier/supplierTypes";
import {
  buildInsightLookup,
  productIdsWithHealth,
  type StockHealth,
  type StockInsightRow,
} from "@/lib/queries/stock/stockInsightTypes";
import {
  getProductWithStock,
  type StockAggregateStats,
  type StockSort,
} from "@/lib/queries/products/getProductWithStock";

const activeClass = {
  gray: "bg-primary  text-primary-foreground",
  green: "bg-emerald-600 dark:bg-emerald-500 text-white",
  amber: "bg-amber-500  dark:bg-amber-400  text-primary-foreground",
  red: "bg-red-500    dark:bg-red-400    text-white",
};

const inactiveClass =
  "bg-card text-muted-foreground border border-border hover:border-border";

const StockPage = () => {
  const t = useTranslation();
  const n = useLocalNum();
  const { storeId, storeSlug } = useCurrentUser();
  // Stores with branches: the header's branch picker decides whose stock this
  // page shows and changes. "All branches" is read-only.
  const { enabled: branchesOn, selectedBranchId, selectedBranch, branches, canSeeAllBranches } = useBranches();
  const stockBranchId = branchesOn ? selectedBranchId : null;
  const stockReadOnly = branchesOn && !selectedBranchId;
  const { can } = usePermissions();
  // Sales speed is its own permission, so a role can change stock without seeing it (and the reverse).
  const canInsights = can("stock.insights");
  const { allowed: exportAllowed } = useFeatureGate(storeId, "export_data");
  // Its own flag, separate from stock export ("export_data") and the
  // Products page's "product_csv_export" — each export surface is gated
  // individually so a plan can grant one without the others.
  const { allowed: traderPriceAllowed } = useFeatureGate(storeId, "trader_price_export");
  const { currency } = useUserCurrencyIcon();
  const CURRENCY_SYMBOLS: Record<string, string> = {
    BDT: "৳",
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
  };
  const currencySymbol = currency
    ? (CURRENCY_SYMBOLS[currency.toUpperCase()] ?? currency)
    : "৳";

  const FILTER_CONFIG: { value: StockFilter; label: string; color: string }[] = [
    { value: StockFilter.ALL, label: t.admin.stockAll, color: "gray" },
    { value: StockFilter.IN, label: t.admin.stockInStock, color: "green" },
    { value: StockFilter.LOW, label: t.admin.stockLowStock, color: "amber" },
    { value: StockFilter.OUT, label: t.admin.stockOutOfStock, color: "red" },
    ...(canInsights
      ? [
          { value: StockFilter.RESTOCK, label: t.admin.shHealthRestock, color: "red" },
          { value: StockFilter.SLOW, label: t.admin.shHealthSlow, color: "amber" },
          { value: StockFilter.DEAD, label: t.admin.shHealthDead, color: "gray" },
        ]
      : []),
  ];

  const FILTER_HEALTH: Partial<Record<StockFilter, StockHealth>> = {
    [StockFilter.RESTOCK]: "restock",
    [StockFilter.SLOW]: "slow",
    [StockFilter.DEAD]: "dead",
  };

  const [searchText, setSearchText] = useUrlSync<string>("search", "");
  // "" = every supplier, "none" = products without one, otherwise a supplier id.
  const [supplierFilter, setSupplierFilter] = useUrlSync<string>("supplier", "");
  const [stockFilter, setStockFilter] = useUrlSync<StockFilter>(
    "filter",
    StockFilter.ALL,
    (v) => (v as StockFilter) || StockFilter.ALL,
  );
  const [currentPage, setCurrentPage] = useUrlSync<number>(
    "page",
    1,
    (v) => Number(v) || 1,
  );
  const [pageSize, setPageSize] = useUrlSync<number>(
    "pageSize",
    10,
    (v) => Number(v) || 10,
  );
  const [stockSort, setStockSort] = useUrlSync<StockSort>(
    "sort",
    null,
    (v) => (v === "asc" || v === "desc" ? v : null),
  );
  const [totalProducts, setTotalProducts] = React.useState(0);
  const [stats, setStats] = React.useState<StockAggregateStats | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [traderModalOpen, setTraderModalOpen] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sales speed for every product, fetched once and reused by the list, the
  // health card and the Restock / Slow / Not selling filters.
  const [insightRows, setInsightRows] = useState<StockInsightRow[] | null>(null);
  const [insightSummary, setInsightSummary] = useState<Parameters<typeof StockHealthCard>[0]["summary"] | null>(null);
  const loadInsights = useCallback(async () => {
    if (!storeId || !canInsights) {
      setInsightRows(null);
      setInsightSummary(null);
      return;
    }
    const result = await getStockInsights(storeId, stockBranchId);
    if (result.ok) {
      setInsightRows(result.data.rows);
      setInsightSummary(result.data.summary);
    } else {
      setInsightRows(null);
      setInsightSummary(null);
    }
  }, [storeId, canInsights, stockBranchId]);
  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  // Suppliers and which product uses which, for the chips, the bulk assign bar and the supplier filter.
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

  // How many items are waiting on the reorder list. Read after mount, because this count lives in the browser.
  const reorderCount = useReorderListStore((s) => (storeId ? (s.itemsByStore[storeId]?.length ?? 0) : 0));
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const insightLookup = useMemo(() => (insightRows ? buildInsightLookup(insightRows) : null), [insightRows]);
  const activeHealth = FILTER_HEALTH[stockFilter] ?? null;
  // A sales filter shows nothing until the sales figures arrive, rather than briefly listing everything.
  const onlyProductIds = useMemo(() => {
    let ids: Set<string> | null = null;
    if (activeHealth) {
      ids = insightRows ? productIdsWithHealth(insightRows, activeHealth) : new Set<string>();
    }
    if (supplierFilter && supplierFilter !== "none") {
      const ofSupplier = new Set(
        Object.entries(supplierByProduct)
          .filter(([, supplierId]) => supplierId === supplierFilter)
          .map(([productId]) => productId),
      );
      ids = ids ? new Set([...ids].filter((id) => ofSupplier.has(id))) : ofSupplier;
    }
    return ids;
  }, [activeHealth, insightRows, supplierFilter, supplierByProduct]);
  const excludeProductIds = useMemo(
    () => (supplierFilter === "none" ? new Set(Object.keys(supplierByProduct)) : null),
    [supplierFilter, supplierByProduct],
  );
  const healthProductCount = useCallback(
    (health: StockHealth) => (insightRows ? productIdsWithHealth(insightRows, health).size : null),
    [insightRows],
  );

  // The box keeps its own text so typing is instant; the URL (and the fetch
  // it triggers) only updates once typing pauses. Binding the input straight
  // to the URL made every keystroke wait for a navigation before the next
  // letter could appear.
  const [searchInput, setSearchInput] = useState(searchText);
  useEffect(() => {
    // Back/forward or a cleared filter changed the URL from outside the box.
    if (!typingTimeoutRef.current) setSearchInput(searchText);
  }, [searchText]);

  // Shared by both exports: fetch every product matching the current filters,
  // ignoring pagination. Memoised because TraderPriceExportModal takes it as an
  // effect dependency — a new identity each render would re-trigger the load.
  const fetchAllProducts = useCallback(async (branchId: string | null = stockBranchId) => {
    if (!storeSlug) return [];
    const result = await getProductWithStock(
      storeSlug,
      searchText,
      stockFilter,
      1,
      Number.MAX_SAFE_INTEGER,
      null,
      branchId,
    );
    return result.data;
  }, [storeSlug, searchText, stockFilter, stockBranchId]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    setIsTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
      setIsTyping(false);
      setSearchText(value);
      setCurrentPage(1);
    }, 350);
  };

  const totalPages = Math.ceil(totalProducts / pageSize) || 1;

  return (
    <div className="px-4 md:px-8 py-6 space-y-5">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            {t.admin.menuStockUpdate}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t.admin.stockSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {totalProducts > 0 && (
            <span
              className="
              text-xs font-medium px-2.5 py-1 rounded-full
              bg-muted
              text-muted-foreground
              border border-border
            "
            >
              {n(totalProducts)} {t.admin.stockProducts}
            </span>
          )}
          {canInsights && (
            <>
              <Link
                href="/dashboard/stock/health"
                className="inline-flex items-center gap-1.5 rounded-xl h-9 px-3 border border-border bg-card text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <Activity size={14} aria-hidden="true" />
                <span className="hidden sm:inline">{t.admin.menuStockHealth}</span>
              </Link>
              <Link
                href="/dashboard/stock/reorder"
                className="inline-flex items-center gap-1.5 rounded-xl h-9 px-3 border border-border bg-card text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <ClipboardList size={14} aria-hidden="true" />
                <span className="hidden sm:inline">{t.admin.menuReorderList}</span>
                {mounted && reorderCount > 0 && (
                  <span className="rounded-full bg-indigo-600 px-1.5 text-[10px] font-bold text-white">{n(reorderCount)}</span>
                )}
              </Link>
            </>
          )}
          <StockExportButton
            storeSlug={storeSlug ?? undefined}
            branches={branchesOn ? branches : undefined}
            allowAllBranches={canSeeAllBranches}
            locked={!exportAllowed}
            fetchAllProducts={fetchAllProducts}
          />
          {traderPriceAllowed ? (
            <Button
              icon={<Percent size={14} />}
              className="rounded-xl h-9 border-border dark:bg-gray-700 dark:text-gray-300 font-medium"
              onClick={() => setTraderModalOpen(true)}
            >
              <span className="hidden sm:inline">Trader prices</span>
            </Button>
          ) : (
            <Popover
              content={
                <FeatureUpsell
                  title="Trader prices are a Pro feature"
                  description="Your current plan doesn't include exporting your trade (cost) prices. Upgrade to download them anytime."
                />
              }
              trigger="click"
              placement="bottomRight"
            >
              <Button
                icon={<LockOutlined />}
                className="rounded-xl h-9 border-border bg-background/60 text-muted-foreground font-medium"
              >
                <span className="hidden sm:inline">Trader prices</span>
              </Button>
            </Popover>
          )}
        </div>
      </div>

      <TraderPriceExportModal
        open={traderModalOpen}
        onClose={() => setTraderModalOpen(false)}
        storeSlug={storeSlug ?? undefined}
        fetchAllProducts={fetchAllProducts}
      />

      {/* ── KPI stats ── */}
      <StockStats stats={stats} currencySymbol={currencySymbol} />

      {canInsights && insightSummary && (
        <StockHealthCard
          summary={insightSummary}
          formatMoney={(amount) => `${currencySymbol}${n(Math.round(amount).toLocaleString())}`}
          activeHealth={activeHealth}
          onSelect={(health) => {
            const target =
              health === "restock"
                ? StockFilter.RESTOCK
                : health === "slow"
                  ? StockFilter.SLOW
                  : health === "dead"
                    ? StockFilter.DEAD
                    : StockFilter.ALL;
            setStockFilter(stockFilter === target ? StockFilter.ALL : target);
            setCurrentPage(1);
          }}
        />
      )}

      {/* ── Search + Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <SearchOutlined
            className="
            absolute left-3 top-1/2 -translate-y-1/2 z-10
            text-muted-foreground text-sm pointer-events-none
          "
          />
          <input
            type="text"
            placeholder={t.admin.stockSearchPlaceholder}
            value={searchInput}
            onChange={handleSearchChange}
            className="
              w-full pl-9 pr-4 py-2.5
              rounded-xl text-sm
              bg-card/80
              border border-border
              text-foreground
              placeholder-gray-400 dark:placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400
              dark:focus:border-blue-500
              transition-all duration-150
            "
          />
          {isTyping && (
            <span
              className="
              absolute right-3 top-1/2 -translate-y-1/2
              text-xs text-muted-foreground
            "
            >
              …
            </span>
          )}
        </div>

        {/* Supplier filter */}
        {(suppliers.length > 0 || supplierFilter) && (
          <Select
            value={supplierFilter || ""}
            onChange={(value) => {
              setSupplierFilter(value);
              setCurrentPage(1);
            }}
            className="w-full sm:w-52"
            size="large"
            options={[
              { value: "", label: t.admin.spAllSuppliers },
              { value: "none", label: t.admin.spNoSupplier },
              ...suppliers.map((s) => ({ value: s.id, label: s.name })),
            ]}
          />
        )}

        {/* Desktop filter pills */}
        <div className="hidden md:flex items-center gap-1.5 flex-wrap">
          {FILTER_CONFIG.map(({ value, label, color }) => {
            const isActive = stockFilter === value;
            const filterHealth = FILTER_HEALTH[value];
            const count = filterHealth
              ? healthProductCount(filterHealth)
              : stats
                ? value === StockFilter.ALL
                  ? stats.counts.all
                  : value === StockFilter.IN
                    ? stats.counts.in
                    : value === StockFilter.LOW
                      ? stats.counts.low
                      : stats.counts.out
                : null;
            return (
              <button
                key={value}
                onClick={() => { setStockFilter(value); setCurrentPage(1); }}
                className={`
                  px-3.5 py-2 rounded-xl text-xs font-semibold
                  transition-all duration-150 whitespace-nowrap
                  ${isActive ? activeClass[color as keyof typeof activeClass] : inactiveClass}
                `}
              >
                {label}
                {count !== null && (
                  <span className={isActive ? "opacity-85" : "opacity-60"}> {n(count)}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Mobile filter */}
        <div className="md:hidden">
          <MobileFilter
            value={stockFilter}
            defaultValue={StockFilter.ALL}
            options={FILTER_CONFIG.map((f) => f.value)}
            onChange={(v) => { setStockFilter(v); setCurrentPage(1); }}
            getLabel={(v) =>
              FILTER_CONFIG.find((f) => f.value === v)?.label ?? v
            }
          />
        </div>
      </div>

      {/* ── Table ── */}
      {branchesOn && (
        <div
          className={`rounded-xl border px-4 py-2.5 text-sm ${
            stockReadOnly
              ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"
              : "border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-900 dark:bg-teal-950/30 dark:text-teal-300"
          }`}
        >
          {stockReadOnly
            ? t.branches.stockAllBranchesNote
            : t.branches.stockBranchNote.replace("{name}", selectedBranch?.name ?? "")}
        </div>
      )}

      <StockChangeTable
        branchId={stockBranchId}
        readOnly={stockReadOnly}
        searchText={searchText}
        stockFilter={stockFilter}
        currentPage={currentPage}
        pageSize={pageSize}
        stockSort={stockSort}
        onSortChange={setStockSort}
        onTotalChange={setTotalProducts}
        onStatsChange={setStats}
        insights={insightLookup}
        onlyProductIds={onlyProductIds}
        excludeProductIds={excludeProductIds}
        onStockChanged={loadInsights}
        suppliers={suppliers}
        supplierByProduct={supplierByProduct}
        canAssignSupplier={can("stock.edit")}
        canReorder={canInsights}
        onSuppliersChanged={loadSuppliers}
      />

      {/* ── Pagination ── */}
      {totalProducts > 0 && (
        <>
          {/* Mobile */}
          <div className="flex flex-col items-center gap-2 md:hidden">
            <p className="text-xs text-muted-foreground">
              {n(Math.min((currentPage - 1) * pageSize + 1, totalProducts))}–
              {n(Math.min(currentPage * pageSize, totalProducts))} {t.admin.customerOfLabel}{" "}
              {n(totalProducts)}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                className="
                  px-3 py-1.5 rounded-lg text-xs font-medium
                  bg-card
                  border border-border
                  text-muted-foreground
                  disabled:opacity-40 disabled:cursor-not-allowed
                  hover:bg-background
                  transition-colors duration-150
                "
              >
                {t.admin.stockPrev}
              </button>
              <span className="text-xs text-muted-foreground px-2">
                {n(currentPage)} / {n(totalPages)}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setCurrentPage(Math.min(currentPage + 1, totalPages))
                }
                className="
                  px-3 py-1.5 rounded-lg text-xs font-medium
                  bg-card
                  border border-border
                  text-muted-foreground
                  disabled:opacity-40 disabled:cursor-not-allowed
                  hover:bg-background
                  transition-colors duration-150
                "
              >
                {t.admin.stockNext}
              </button>
            </div>
          </div>

          {/* Desktop */}
          <div className="hidden md:flex justify-end">
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={totalProducts}
              showSizeChanger
              pageSizeOptions={["10", "20", "50", "100"]}
              onChange={(page, size) => {
                setCurrentPage(page);
                setPageSize(size);
              }}
              showTotal={(total, range) =>
                `${n(range[0])}–${n(range[1])} ${t.admin.customerOfLabel} ${n(total)}`
              }
              className="[&_.ant-pagination-item-active]:border-blue-500! [&_.ant-pagination-item-active_a]:text-blue-600!"
            />
          </div>
        </>
      )}
    </div>
  );
};

export default StockPage;
