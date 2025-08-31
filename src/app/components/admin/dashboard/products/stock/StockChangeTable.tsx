"use client";

import React, { useState } from "react";
import { dummyProducts } from "@/lib/store/dummyProducts";
import StockTable from "./StockTable";
import BulkStockUpdate from "./BulkStockUpdate";
import SheiButton from "@/app/components/ui/SheiButton/SheiButton";

interface Product {
  id: number;
  title: string;
  currentPrice: string;
  stock: number;
  images: string[];
}

const StockChangeTable: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(dummyProducts);
  const [editedStocks, setEditedStocks] = useState<Record<number, number>>({});
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const handleStockChange = (id: number, value: number) => {
    setEditedStocks((prev) => ({ ...prev, [id]: value }));
  };

  const handleBulkUpdate = (value: number) => {
    const newEditedStocks = { ...editedStocks };
    selectedRowKeys.forEach((key) => {
      const id = Number(key);
      const currentStock = products.find((p) => p.id === id)?.stock ?? 0;
      const previousEdit = editedStocks[id] ?? currentStock;
      newEditedStocks[id] = previousEdit + value;
    });
    setEditedStocks(newEditedStocks);
  };

  const handleUpdateStock = () => {
    setProducts((prev) =>
      prev.map((p) =>
        editedStocks[p.id] !== undefined
          ? { ...p, stock: editedStocks[p.id] }
          : p
      )
    );
    setEditedStocks({});
    setSelectedRowKeys([]);
  };

  return (
    <div className="space-y-4">
      <BulkStockUpdate
        selectedCount={selectedRowKeys.length}
        onUpdate={handleBulkUpdate}
      />

      <StockTable
        products={products}
        editedStocks={editedStocks}
        onStockChange={handleStockChange}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
      />

      <div className="flex justify-end">
        <SheiButton
          onClick={handleUpdateStock}
          disabled={Object.keys(editedStocks).length === 0}
        >
          Update Stock
        </SheiButton>
      </div>
    </div>
  );
};

export default StockChangeTable;
