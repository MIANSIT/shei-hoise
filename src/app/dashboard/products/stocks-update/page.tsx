"use client";

import React, { useState } from "react";
import { Input } from "antd";
import StockChangeTable from "@/app/components/admin/dashboard/products/stock/StockChangeTable";

const { Search } = Input;

const StockPage = () => {
  const [searchText, setSearchText] = useState("");

  const handleSearch = (value: string) => {
    setSearchText(value.trim().toLowerCase());
  };

  return (
    <div className="px-4 md:px-8 py-4 space-y-4">
      {/* Title + Search */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold">Manage Product Stock</h1>

        <div className="w-full md:w-1/3">
          <Search
            placeholder="Search by product name or SKU"
            enterButton
            allowClear
            size="large" // ✅ makes input taller
            onSearch={handleSearch}
            onChange={(e) => handleSearch(e.target.value)}
            className="!h-12" // optional: force height
          />
        </div>
      </div>

      {/* Stock table */}
      <StockChangeTable searchText={searchText} />
    </div>
  );
};

export default StockPage;
