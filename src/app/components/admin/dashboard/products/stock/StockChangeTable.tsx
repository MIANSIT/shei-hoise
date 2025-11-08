"use client";

import React, { useEffect, useState } from "react";
import { getProductWithStock } from "@/lib/queries/products/getProductWithStock";
import StockTableMobile from "./StockTableMobile";
import StockTable from "./StockTable"; // desktop table
import BulkStockUpdate from "./BulkStockUpdate";
import {
  mapProductsForModernTable,
  ProductRow,
  VariantRow,
} from "@/lib/hook/products/stock/mapProductsForTable";
import { updateInventory } from "@/lib/queries/inventory/updateInventory";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import LowStockSummary from "@/app/components/admin/dashboard/products/stock/LowStockSummary";
import type { TableRowSelection } from "antd/es/table/interface";

const StockChangeTable: React.FC = () => {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [editedStocks, setEditedStocks] = useState<Record<string, number>>({});
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkActive, setBulkActive] = useState(false);

  const notify = useSheiNotification();
  const { storeSlug, loading: userLoading } = useCurrentUser();

  const fetchProducts = async () => {
    if (!storeSlug) {
      console.warn("⚠️ No store slug found, skipping product fetch");
      return;
    }
    setLoading(true);
    try {
      const data = await getProductWithStock(storeSlug);
      setProducts(mapProductsForModernTable(data));
    } catch (err) {
      console.error("❌ Failed to fetch products:", err);
      notify.error("Failed to load product stock");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userLoading && storeSlug) {
      fetchProducts();
    }
  }, [userLoading, storeSlug]);

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
    if (quantity < 0) {
      notify.error("Stock cannot be negative");
      return;
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
      notify.success("Stock updated successfully");
    } catch (err) {
      console.error("Failed to update stock:", err);
      notify.error("Failed to update stock");
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

  // Fixed rowSelection with proper typing
  const rowSelection: TableRowSelection<ProductRow | VariantRow> = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
    // Optional: Only allow selecting products (not variants)
    getCheckboxProps: (record: ProductRow | VariantRow) => ({
      disabled: !("variants" in record), // Disable selection for variants
    }),
  };

  if (userLoading) {
    return <p className="text-center text-gray-500">Loading user...</p>;
  }

  if (!storeSlug) {
    return (
      <p className="text-center text-gray-500">No store found for this user.</p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <LowStockSummary products={products} />
      </div>
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
          rowSelection={rowSelection} // Use the properly typed rowSelection
          loading={loading}
          bulkActive={bulkActive}
        />
      </div>
    </div>
  );
};

export default StockChangeTable;
