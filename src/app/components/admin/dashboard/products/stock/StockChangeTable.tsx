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
import { useSheiNotification } from "@/lib/hook/useSheiNotification"; // import your notification hook

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

  // Single row update with notification
  const handleSingleUpdate = async (
    productId: string,
    variantId: string | null,
    quantity: number
  ) => {
    const product = products.find((p) => p.id === productId);

    // Return early if product is not found
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

  // Bulk update with notification
  // Bulk update with detailed notification
  const handleBulkUpdate = async (value: number) => {
    if (value === 0 || selectedRowKeys.length === 0) return;

    setBulkActive(true);

    // First, check if any product/variant would go below 0
    for (const key of selectedRowKeys) {
      const id = String(key);
      const product = products.find((p) => p.id === id);
      if (!product) continue;

      if (product.variants?.length) {
        for (const v of product.variants) {
          if (v.stock + value < 0) {
            notify.error(
              `Cannot deduct ${Math.abs(value)} from "${
                product.title
              }" variant "${v.title}" — stock cannot be negative`
            );
            setBulkActive(false);
            return;
          }
        }
      } else {
        if (product.stock + value < 0) {
          notify.error(
            `Cannot deduct ${Math.abs(value)} from "${
              product.title
            }" — stock cannot be negative`
          );
          setBulkActive(false);
          return;
        }
      }
    }

    // All stocks valid, perform update
    const successProducts: string[] = [];
    const failedProducts: string[] = [];

    for (const key of selectedRowKeys) {
      const id = String(key);
      const product = products.find((p) => p.id === id);
      if (!product) continue;

      try {
        if (product.variants?.length) {
          for (const v of product.variants) {
            const newStock = v.stock + value;
            await updateInventory({
              product_id: product.id,
              variant_id: v.id,
              quantity_available: newStock,
            });
          }
        } else {
          const newStock = product.stock + value;
          await updateInventory({
            product_id: product.id,
            quantity_available: newStock,
          });
        }

        successProducts.push(product.title);
      } catch (err) {
        console.error(`Failed to update ${product.title}:`, err);
        failedProducts.push(product.title);
      }
    }

    setEditedStocks({});
    await fetchProducts();
    setBulkActive(false);

    const formatProductList = (list: string[], limit = 3) => {
      if (list.length <= limit) return list.join(", ");
      const first = list.slice(0, limit).join(", ");
      return `${first} … +${list.length - limit} more`;
    };

    if (successProducts.length > 0) {
      notify.success(
        `Updated stock successfully for: ${formatProductList(successProducts)}`
      );
    }

    if (failedProducts.length > 0) {
      notify.error(
        `Failed to update stock for: ${formatProductList(failedProducts)}`
      );
    }
  };

  return (
    <div className="space-y-4">
      <BulkStockUpdate
        selectedCount={selectedRowKeys.length}
        onUpdate={handleBulkUpdate}
        loading={bulkActive}
      />
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
