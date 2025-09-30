"use client";

import React, { useEffect, useState } from "react";
import { getProductWithStock } from "@/lib/queries/products/getProductWithStock";
import StockTable from "./StockTable";
import BulkStockUpdate from "./BulkStockUpdate";
import {
  mapProductsForModernTable,
  ProductRow,
} from "@/lib/hook/products/stock/mapProductsForTable";
import { updateInventory } from "@/lib/queries/inventory/updateInventory";

const StockChangeTable: React.FC = () => {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Individual stock change
  const handleStockChange = async (
    productId: string,
    variantId: string | null,
    newStock: number
  ) => {
    try {
      await updateInventory({
        product_id: productId,
        variant_id: variantId,
        quantity_available: newStock,
      });
      console.log("Updated:", { productId, variantId, newStock });
      // refetch updated products
      fetchProducts();
    } catch (err) {
      console.error("Failed to update stock:", err);
    }
  };

  // Bulk update
  // Inside StockChangeTable.tsx, replace handleBulkUpdate with:
  const handleBulkUpdate = async (value: number) => {
    for (const key of selectedRowKeys) {
      const id = String(key);
      const product = products.find((p) => p.id === id);

      if (!product) continue;

      if (product.variants?.length) {
        for (const v of product.variants) {
          const newStock = v.stock + value;
          try {
            await updateInventory({
              product_id: product.id,
              variant_id: v.id, // variant_id is UUID
              quantity_available: newStock,
            });
            console.log({ productId: product.id, variantId: v.id, newStock });
          } catch (err) {
            console.error("Failed to update variant stock:", err);
          }
        }
      } else {
        const newStock = product.stock + value;
        try {
          await updateInventory({
            product_id: product.id,
            variant_id: null, // null for main product
            quantity_available: newStock,
          });
          console.log({ productId: product.id, variantId: null, newStock });
        } catch (err) {
          console.error("Failed to update product stock:", err);
        }
      }
    }

    // Refetch all products after bulk update
    fetchProducts();
  };

  return (
    <div className="space-y-4">
      <BulkStockUpdate
        selectedCount={selectedRowKeys.length}
        onUpdate={handleBulkUpdate}
      />
      <StockTable
        products={products}
        onStockChange={handleStockChange}
        rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
        loading={loading}
      />
    </div>
  );
};

export default StockChangeTable;
