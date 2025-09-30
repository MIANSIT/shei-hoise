"use client";

import React, { useEffect, useState } from "react";
import { getProductWithStock } from "@/lib/queries/products/getProductWithStock";
import StockTable from "./StockTable";
import BulkStockUpdate from "./BulkStockUpdate";
import { mapProductsForModernTable, ProductRow } from "@/lib/hook/products/stock/mapProductsForTable";
import { updateInventory } from "@/lib/queries/inventory/updateInventory";

const StockChangeTable: React.FC = () => {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [editedStocks, setEditedStocks] = useState<Record<string, number>>({});
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkActive, setBulkActive] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await getProductWithStock();
      setProducts(mapProductsForModernTable(data));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Handle individual input change
  const handleStockChange = (productId: string, variantId: string | null, value: number) => {
    setEditedStocks((prev) => ({ ...prev, [variantId ?? productId]: value }));
  };

  // Single row update
  const handleSingleUpdate = async (productId: string, variantId: string | null, quantity: number) => {
    try {
      await updateInventory({ product_id: productId, variant_id: variantId, quantity_available: quantity });
      console.log("Single updated:", { productId, variantId, quantity });
      setEditedStocks((prev) => {
        const copy = { ...prev };
        delete copy[variantId ?? productId];
        return copy;
      });
      await fetchProducts();
    } catch (err) {
      console.error("Failed to update stock:", err);
    }
  };

  // Bulk update
  const handleBulkUpdate = async (value: number) => {
    setBulkActive(true);
    for (const key of selectedRowKeys) {
      const id = String(key);
      const product = products.find((p) => p.id === id);
      if (!product) continue;

      if (product.variants?.length) {
        for (const v of product.variants) {
          const newStock = v.stock + value;
          await updateInventory({ product_id: product.id, variant_id: v.id, quantity_available: newStock });
          console.log("Bulk updated variant:", { productId: product.id, variantId: v.id, newStock });
        }
      } else {
        const newStock = product.stock + value;
        await updateInventory({ product_id: product.id, variant_id: null, quantity_available: newStock });
        console.log("Bulk updated product:", { productId: product.id, variantId: null, newStock });
      }
    }
    setEditedStocks({});
    setBulkActive(false);
    await fetchProducts();
  };

  return (
    <div className="space-y-4">
      <BulkStockUpdate selectedCount={selectedRowKeys.length} onUpdate={handleBulkUpdate} loading={bulkActive} />
      <StockTable
        products={products}
        editedStocks={editedStocks}
        onStockChange={handleStockChange}
        onSingleUpdate={handleSingleUpdate}
        rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
        loading={loading}
        bulkActive={bulkActive}
      />
    </div>
  );
};

export default StockChangeTable;
