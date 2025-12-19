"use client";
import React, { useState, useRef } from "react";
import { Input, Pagination, Space, Button } from "antd";
import StockChangeTable from "@/app/components/admin/dashboard/products/stock/StockChangeTable";
import { StockFilter } from "@/lib/types/enums";
import { useUrlSync } from "@/lib/hook/filterWithUrl/useUrlSync";
import MobileFilter from "@/app/components/admin/common/MobileFilter"; // adjust path

const StockPage = () => {
  const [searchText, setSearchText] = useUrlSync<string>("search", "");
  const [stockFilter, setStockFilter] = useUrlSync<StockFilter>(
    "filter",
    StockFilter.ALL,
    (v) => (v as StockFilter) || StockFilter.ALL
  );
  const [currentPage, setCurrentPage] = useUrlSync<number>(
    "page",
    1,
    (v) => Number(v) || 1
  );
  const [pageSize, setPageSize] = useUrlSync<number>(
    "pageSize",
    10,
    (v) => Number(v) || 10
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

  const filterOptions: StockFilter[] = [
    StockFilter.ALL,
    StockFilter.LOW,
    StockFilter.IN,
    StockFilter.OUT,
  ];

  const getFilterLabel = (value: StockFilter) => {
    switch (value) {
      case StockFilter.ALL:
        return "All Stocks";
      case StockFilter.LOW:
        return "Low Stock";
      case StockFilter.IN:
        return "In Stock";
      case StockFilter.OUT:
        return "Out of Stock";
      default:
        return value;
    }
  };

  return (
    <div className="px-4 md:px-8 py-4 space-y-4">
      {/* Search + Filter */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1 md:max-w-md">
          <Space.Compact className="w-full">
            <Input
              placeholder="Search by product name or SKU"
              size="large"
              allowClear
              value={searchText}
              onChange={handleSearchChange}
              onPressEnter={() => setSearchText(searchText)}
              suffix={
                isTyping ? (
                  <span className="text-xs text-gray-500">Typing...</span>
                ) : null
              }
            />
            <Button
              type="primary"
              size="large"
              onClick={() => setSearchText(searchText)}
            >
              Search
            </Button>
          </Space.Compact>
        </div>

        {/* Desktop: button filters */}
        <div className="hidden md:flex gap-2">
          {filterOptions.map((opt) => (
            <Button
              key={opt}
              type={stockFilter === opt ? "primary" : "default"}
              onClick={() => setStockFilter(opt)}
            >
              {getFilterLabel(opt)}
            </Button>
          ))}
        </div>

        {/* Mobile: MobileFilter */}
        <div className="md:hidden w-full">
          <MobileFilter
            value={stockFilter}
            defaultValue={StockFilter.ALL}
            options={filterOptions}
            onChange={setStockFilter}
            getLabel={getFilterLabel}
          />
        </div>
      </div>

      {/* Stock Table */}
      <StockChangeTable
        searchText={searchText}
        stockFilter={stockFilter}
        currentPage={currentPage}
        pageSize={pageSize}
        onTotalChange={setTotalProducts}
      />

      {/* Mobile Pagination */}
      <div className="flex flex-col items-center gap-2 mt-4 md:hidden">
        <div className="text-sm text-gray-600">
          {`${Math.min(
            (currentPage - 1) * pageSize + 1,
            totalProducts
          )}-${Math.min(
            currentPage * pageSize,
            totalProducts
          )} of ${totalProducts} items`}
        </div>
        <div className="flex gap-2">
          <Button
            size="small"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
          >
            ← Previous
          </Button>
          <span className="text-sm">
            Page {currentPage} of {Math.ceil(totalProducts / pageSize) || 1}
          </span>
          <Button
            size="small"
            disabled={currentPage >= Math.ceil(totalProducts / pageSize)}
            onClick={() =>
              setCurrentPage(
                Math.min(currentPage + 1, Math.ceil(totalProducts / pageSize))
              )
            }
          >
            Next →
          </Button>
        </div>
      </div>

      {/* Desktop Pagination */}
      <div className="justify-end hidden md:flex">
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
            `${range[0]}-${range[1]} of ${total} items`
          }
        />
      </div>
    </div>
  );
};

export default StockPage;
