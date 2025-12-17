"use client"
import React, { useState, useRef } from "react";
import { Input, Select, Pagination, Space, Button } from "antd";
import StockChangeTable from "@/app/components/admin/dashboard/products/stock/StockChangeTable";
import { StockFilter } from "@/lib/types/enums";
import { useUrlSync } from "@/lib/hook/filterWithUrl/useUrlSync";

const { Option } = Select;

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

  // Typing indicator
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    setIsTyping(true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Stop showing "Typing..." after 800ms of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 800);
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
        <div className="w-full md:w-48">
          <Select
            value={stockFilter}
            onChange={setStockFilter}
            size="large"
            className="w-full"
          >
            <Option value={StockFilter.ALL}>All Stocks</Option>
            <Option value={StockFilter.LOW}>Low Stock</Option>
            <Option value={StockFilter.IN}>In Stock</Option>
            <Option value={StockFilter.OUT}>Out of Stock</Option>
          </Select>
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

      {/* Pagination */}
      <div className="flex justify-end">
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
