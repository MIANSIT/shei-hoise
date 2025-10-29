"use client";

import React, { useEffect, useState } from "react";
import { getProductWithStock } from "@/lib/queries/products/getProductWithStock";
import StockTableMobile from "./StockTableMobile";
import StockTable from "./StockTable"; // desktop table
import BulkStockUpdate from "./BulkStockUpdate";
import {
  mapProductsForModernTable,
  ProductRow,
} from "@/lib/hook/products/stock/mapProductsForTable";
import { updateInventory } from "@/lib/queries/inventory/updateInventory";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";

const StockChangeTable: React.FC = () => {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [editedStocks, setEditedStocks] = useState<Record<string, number>>({});
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkActive, setBulkActive] = useState(false);

  const notify = useSheiNotification();

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

  const handleStockChange = (
    productId: string,
    variantId: string | null,
    value: number
  ) => {
    setEditedStocks((prev) => ({ ...prev, [variantId ?? productId]: value }));
  };

  const handleSingleUpdate = async (
    productId: string,
    variantId: string | null,
    quantity: number
  ) => {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      notify.error("Product not found");
      return;
    }

    // Check for negative stock
    if (variantId && product.variants?.length) {
      const variant = product.variants.find((v) => v.id === variantId);
      if (!variant) {
        notify.error("Variant not found");
        return;
      }
      if (quantity < 0) {
        notify.error(
          `Cannot set stock of "${product.title}" variant "${variant.title}" below 0`
        );
        return;
      }
    } else {
      if (quantity < 0) {
        notify.error(`Cannot set stock of "${product.title}" below 0`);
        return;
      }
    }
    try {
      await updateInventory({
        product_id: productId,
        ...(variantId ? { variant_id: variantId } : {}),
        quantity_available: quantity,
      });
      setEditedStocks((prev) => {
        const copy = { ...prev };
        delete copy[variantId ?? productId];
        return copy;
      });
      await fetchProducts();
      notify.success(
        `Stock updated successfully for "${product.title}"${
          variantId
            ? ` variant "${
                product.variants?.find((v) => v.id === variantId)?.title
              }"`
            : ""
        }`
      );
    } catch (err) {
      console.error("Failed to update stock:", err);
      notify.error(
        `Failed to update stock for "${product.title}"${
          variantId
            ? ` variant "${
                product.variants?.find((v) => v.id === variantId)?.title
              }"`
            : ""
        }`
      );
    }
  };

  const handleBulkUpdate = async (value: number) => {
    if (value === 0 || selectedRowKeys.length === 0) return;

    setBulkActive(true);

    for (const key of selectedRowKeys) {
      const product = products.find((p) => p.id === key);
      if (!product) continue;

      try {
        if (product.variants?.length) {
          for (const v of product.variants) {
            await updateInventory({
              product_id: product.id,
              variant_id: v.id,
              quantity_available: v.stock + value,
            });
          }
        } else {
          await updateInventory({
            product_id: product.id,
            quantity_available: product.stock + value,
          });
        }
      } catch (err) {
        console.error(`Failed to update ${product.title}:`, err);
      }
    }

    setEditedStocks({});
    await fetchProducts();
    setBulkActive(false);
  };

  return (
    <div className="space-y-4">
      <BulkStockUpdate
        selectedCount={selectedRowKeys.length}
        onUpdate={handleBulkUpdate}
        loading={bulkActive}
      />

      {/* Mobile view */}
      <StockTableMobile
        products={products}
        editedStocks={editedStocks}
        onStockChange={handleStockChange}
        onSingleUpdate={handleSingleUpdate}
        selectedRowKeys={selectedRowKeys}
        onSelectChange={setSelectedRowKeys}
        bulkActive={bulkActive}
      />

      {/* Desktop view */}
      <div className="hidden md:block">
        <StockTable
          products={products}
          editedStocks={editedStocks}
          onStockChange={handleStockChange}
          onSingleUpdate={handleSingleUpdate}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          loading={loading}
          bulkActive={bulkActive}
        />
      </div>
    </div>
  );
};

export default StockChangeTable;
