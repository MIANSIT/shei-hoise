"use client";

import React, { useState, useEffect } from "react";
import { Input, Select } from "antd";
import { useSearchParams } from "next/navigation";
import StockChangeTable from "@/app/components/admin/dashboard/products/stock/StockChangeTable";
import { StockFilter } from "@/lib/types/enums";

const { Search } = Input;
const { Option } = Select;

const StockPage = () => {
  const searchParams = useSearchParams();
  const queryFilter = searchParams.get("filter") as StockFilter | null;

  const [searchText, setSearchText] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>(
    queryFilter || StockFilter.ALL
  );

  useEffect(() => {
    if (queryFilter) setStockFilter(queryFilter as StockFilter);
  }, [queryFilter]);

  const handleSearch = (value: string) => {
    setSearchText(value.trim().toLowerCase());
  };

  const handleFilterChange = (value: StockFilter) => {
    setStockFilter(value);
  };

  return (
    <div className="px-4 md:px-8 py-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Search Input (Left) */}
        <div className="flex-1 md:max-w-md">
          <Search
            placeholder="Search by product name or SKU"
            enterButton
            allowClear
            size="large"
            onSearch={handleSearch}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {/* Stock Filter Dropdown (Right) */}
        <div className="w-full md:w-48">
          <Select
            value={stockFilter}
            onChange={handleFilterChange}
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
      <div className="mt-4">
        <StockChangeTable searchText={searchText} stockFilter={stockFilter} />
      </div>
    </div>
  );
};

export default StockPage;
