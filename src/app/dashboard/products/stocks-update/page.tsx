"use client";
import React, { useState, useRef } from "react";
import { Pagination } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import StockChangeTable from "@/app/components/admin/dashboard/products/stock/StockChangeTable";
import StockExportButton from "@/app/components/admin/dashboard/products/stock/StockExportButton";
import StockStats from "@/app/components/admin/dashboard/products/stock/StockStats";
import { StockFilter } from "@/lib/types/enums";
import { useUrlSync } from "@/lib/hook/filterWithUrl/useUrlSync";
import MobileFilter from "@/app/components/admin/common/MobileFilter";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useFeatureGate } from "@/lib/hook/useFeatureGate";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import {
  getProductWithStock,
  type StockAggregateStats,
  type StockSort,
} from "@/lib/queries/products/getProductWithStock";

const activeClass = {
  gray: "bg-gray-900  dark:bg-gray-100  text-white  dark:text-gray-900",
  green: "bg-emerald-600 dark:bg-emerald-500 text-white",
  amber: "bg-amber-500  dark:bg-amber-400  text-white  dark:text-gray-900",
  red: "bg-red-500    dark:bg-red-400    text-white",
};

const inactiveClass =
  "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500";

const StockPage = () => {
  const t = useTranslation();
  const n = useLocalNum();
  const { storeId, storeSlug } = useCurrentUser();
  const { allowed: exportAllowed } = useFeatureGate(storeId, "export_data");
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
  ];

  const [searchText, setSearchText] = useUrlSync<string>("search", "");
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
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    setCurrentPage(1);
    setIsTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 800);
  };

  const totalPages = Math.ceil(totalProducts / pageSize) || 1;

  return (
    <div className="px-4 md:px-8 py-6 space-y-5">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">
            {t.admin.stockTitle}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {t.admin.stockSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {totalProducts > 0 && (
            <span
              className="
              text-xs font-medium px-2.5 py-1 rounded-full
              bg-gray-100 dark:bg-gray-800
              text-gray-500 dark:text-gray-400
              border border-gray-200 dark:border-gray-700
            "
            >
              {n(totalProducts)} {t.admin.stockProducts}
            </span>
          )}
          <StockExportButton
            storeSlug={storeSlug ?? undefined}
            locked={!exportAllowed}
            fetchAllProducts={async () => {
              if (!storeSlug) return [];
              const result = await getProductWithStock(
                storeSlug,
                searchText,
                stockFilter,
                1,
                Number.MAX_SAFE_INTEGER,
              );
              return result.data;
            }}
          />
        </div>
      </div>

      {/* ── KPI stats ── */}
      <StockStats stats={stats} currencySymbol={currencySymbol} />

      {/* ── Search + Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <SearchOutlined
            className="
            absolute left-3 top-1/2 -translate-y-1/2 z-10
            text-gray-400 dark:text-gray-500 text-sm pointer-events-none
          "
          />
          <input
            type="text"
            placeholder={t.admin.stockSearchPlaceholder}
            value={searchText}
            onChange={handleSearchChange}
            className="
              w-full pl-9 pr-4 py-2.5
              rounded-xl text-sm
              bg-white dark:bg-gray-800/80
              border border-gray-200 dark:border-gray-700
              text-gray-800 dark:text-gray-200
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
              text-xs text-gray-400 dark:text-gray-500
            "
            >
              …
            </span>
          )}
        </div>

        {/* Desktop filter pills */}
        <div className="hidden md:flex items-center gap-1.5 flex-wrap">
          {FILTER_CONFIG.map(({ value, label, color }) => {
            const isActive = stockFilter === value;
            const count = stats
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
      <StockChangeTable
        searchText={searchText}
        stockFilter={stockFilter}
        currentPage={currentPage}
        pageSize={pageSize}
        stockSort={stockSort}
        onSortChange={setStockSort}
        onTotalChange={setTotalProducts}
        onStatsChange={setStats}
      />

      {/* ── Pagination ── */}
      {totalProducts > 0 && (
        <>
          {/* Mobile */}
          <div className="flex flex-col items-center gap-2 md:hidden">
            <p className="text-xs text-gray-500 dark:text-gray-400">
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
                  bg-white dark:bg-gray-800
                  border border-gray-200 dark:border-gray-700
                  text-gray-600 dark:text-gray-400
                  disabled:opacity-40 disabled:cursor-not-allowed
                  hover:bg-gray-50 dark:hover:bg-gray-700
                  transition-colors duration-150
                "
              >
                {t.admin.stockPrev}
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400 px-2">
                {n(currentPage)} / {n(totalPages)}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setCurrentPage(Math.min(currentPage + 1, totalPages))
                }
                className="
                  px-3 py-1.5 rounded-lg text-xs font-medium
                  bg-white dark:bg-gray-800
                  border border-gray-200 dark:border-gray-700
                  text-gray-600 dark:text-gray-400
                  disabled:opacity-40 disabled:cursor-not-allowed
                  hover:bg-gray-50 dark:hover:bg-gray-700
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
