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
    <div className="">
      <h1 className="text-2xl font-bold mb-4">Manage Product Stock</h1>

      {/* Search Input */}
      <div className="mb-4 max-w-md">
        <Search
          placeholder="Search by product name or SKU"
          enterButton
          allowClear
          onSearch={handleSearch}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {/* Pass searchText as prop */}
      <StockChangeTable searchText={searchText} />
    </div>
  );
};

export default StockPage;
