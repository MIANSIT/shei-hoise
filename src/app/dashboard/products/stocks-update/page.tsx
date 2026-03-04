"use client";
import React, { useState, useRef } from "react";
import { Pagination } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import StockChangeTable from "@/app/components/admin/dashboard/products/stock/StockChangeTable";
import { StockFilter } from "@/lib/types/enums";
import { useUrlSync } from "@/lib/hook/filterWithUrl/useUrlSync";
import MobileFilter from "@/app/components/admin/common/MobileFilter";

const FILTER_CONFIG: { value: StockFilter; label: string; color: string }[] = [
  { value: StockFilter.ALL, label: "All", color: "gray" },
  { value: StockFilter.IN, label: "In Stock", color: "green" },
  { value: StockFilter.LOW, label: "Low Stock", color: "amber" },
  { value: StockFilter.OUT, label: "Out of Stock", color: "red" },
];

const activeClass = {
  gray: "bg-gray-900  dark:bg-gray-100  text-white  dark:text-gray-900",
  green: "bg-emerald-600 dark:bg-emerald-500 text-white",
  amber: "bg-amber-500  dark:bg-amber-400  text-white  dark:text-gray-900",
  red: "bg-red-500    dark:bg-red-400    text-white",
};

const inactiveClass =
  "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500";

const StockPage = () => {
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
  const [totalProducts, setTotalProducts] = React.useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
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
            Inventory
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage stock levels across all products and variants
          </p>
        </div>
        {totalProducts > 0 && (
          <span
            className="
            self-start sm:self-auto
            text-xs font-medium px-2.5 py-1 rounded-full
            bg-gray-100 dark:bg-gray-800
            text-gray-500 dark:text-gray-400
            border border-gray-200 dark:border-gray-700
          "
          >
            {totalProducts.toLocaleString()} products
          </span>
        )}
      </div>

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
            placeholder="Search by name or SKU…"
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
            return (
              <button
                key={value}
                onClick={() => setStockFilter(value)}
                className={`
                  px-3.5 py-2 rounded-xl text-xs font-semibold
                  transition-all duration-150 whitespace-nowrap
                  ${isActive ? activeClass[color as keyof typeof activeClass] : inactiveClass}
                `}
              >
                {label}
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
            onChange={setStockFilter}
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
        onTotalChange={setTotalProducts}
      />

      {/* ── Pagination ── */}
      {totalProducts > 0 && (
        <>
          {/* Mobile */}
          <div className="flex flex-col items-center gap-2 md:hidden">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {Math.min((currentPage - 1) * pageSize + 1, totalProducts)}–
              {Math.min(currentPage * pageSize, totalProducts)} of{" "}
              {totalProducts}
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
                ← Prev
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400 px-2">
                {currentPage} / {totalPages}
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
                Next →
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
                `${range[0]}–${range[1]} of ${total}`
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
