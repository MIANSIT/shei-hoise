"use client";

import React, { useEffect, useState } from "react";
import { getProductWithStock } from "@/lib/queries/products/getProductWithStock";
import StockTable from "./StockTable";
import BulkStockUpdate from "./BulkStockUpdate";
import SheiButton from "@/app/components/ui/SheiButton/SheiButton";
import {
  mapProductsForTable,
  TableProduct,
} from "@/lib/queries/products/mapProductsForTable";

const StockChangeTable: React.FC = () => {
  const [products, setProducts] = useState<TableProduct[]>([]);
  const [editedStocks, setEditedStocks] = useState<Record<string, number>>({});
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        const data = await getProductWithStock();
        setProducts(mapProductsForTable(data));
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  const handleStockChange = (id: string, value: number) => {
    setEditedStocks((prev) => ({ ...prev, [id]: value }));
  };

  const handleBulkUpdate = (value: number) => {
    const newEditedStocks = { ...editedStocks };
    selectedRowKeys.forEach((key) => {
      const id = String(key);
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
        loading={loading}
      />

      <div className="flex justify-end">
        <SheiButton
          onClick={handleUpdateStock}
          disabled={Object.keys(editedStocks).length === 0}
          className="!bg-green-600 !text-white hover:!bg-green-700 "
        >
          Update Stock
        </SheiButton>
      </div>
    </div>
  );
};

export default StockChangeTable;
