"use client";

import React, { useEffect, useState } from "react";
import { getProductWithStock } from "@/lib/queries/products/getProductWithStock";
import StockTableMobile from "./StockTableMobile";
import StockTable from "./StockTable";
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
import { App } from "antd";
import { StockFilter } from "@/lib/types/enums";

interface StockChangeTableProps {
  searchText: string;
  stockFilter: StockFilter;
  currentPage: number;
  pageSize: number;
  onTotalChange?: (total: number) => void;
}

const StockChangeTable: React.FC<StockChangeTableProps> = ({
  searchText,
  stockFilter,
  currentPage,
  pageSize,
  onTotalChange,
}) => {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [editedStocks, setEditedStocks] = useState<Record<string, number>>({});
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkActive, setBulkActive] = useState(false);

  const { storeSlug, loading: userLoading } = useCurrentUser();
  const notify = useSheiNotification();
  const { modal } = App.useApp();

  // --- Fetch products ---
  useEffect(() => {
    const fetchProducts = async () => {
      if (!storeSlug) return;
      setLoading(true);
      try {
        const result = await getProductWithStock(
          storeSlug,
          searchText,
          stockFilter,
          currentPage,
          pageSize,
        );

        const mapped: ProductRow[] = mapProductsForModernTable(result.data);
        setProducts(mapped);
        if (onTotalChange) onTotalChange(result.total);
      } catch (err) {
        console.error(err);
        notify.error("Failed to fetch products");
      } finally {
        setLoading(false);
      }
    };

    if (!userLoading && storeSlug) fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    userLoading,
    storeSlug,
    searchText,
    stockFilter,
    currentPage,
    pageSize,
    onTotalChange,
  ]);

  const refreshProducts = async () => {
    if (!storeSlug) return;
    try {
      const result = await getProductWithStock(
        storeSlug,
        searchText,
        stockFilter,
        currentPage,
        pageSize,
      );
      setProducts(mapProductsForModernTable(result.data));
      if (onTotalChange) onTotalChange(result.total);
    } catch (err) {
      console.error(err);
      notify.error("Failed to fetch products");
    }
  };

  // --- Stock editing ---
  const handleStockChange = (
    productId: string,
    variantId: string | null,
    value: number,
  ) => {
    setEditedStocks((prev) => ({ ...prev, [variantId ?? productId]: value }));
  };

  const handleSingleUpdate = async (
    productId: string,
    variantId: string | null,
    quantity: number,
  ) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return notify.error("Product not found");
    if (quantity < 0) return notify.error("Stock cannot be negative");

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

      notify.success("Stock updated successfully");
      await refreshProducts();
    } catch (err) {
      console.error(err);
      notify.error("Failed to update stock");
    }
  };

  // --- Bulk update ---
  // selectedRowKeys can be:
  //   - product IDs (desktop: top-level products without variants, or products with variants)
  //   - variant IDs (mobile: individually selected variants)
  const bulkUpdate = async (value: number) => {
    setBulkActive(true);

    // Build a flat list of { productId, variantId | null, currentStock } to update
    type UpdateTarget = {
      productId: string;
      variantId: string | null;
      currentStock: number;
    };

    const targets: UpdateTarget[] = [];

    for (const key of selectedRowKeys) {
      const keyStr = key as string;

      // Check if key is a product ID
      const product = products.find((p) => p.id === keyStr);
      if (product) {
        if (product.variants?.length) {
          // Desktop path: product with variants → update all active variants
          for (const v of product.variants.filter((v) => v.isActive)) {
            targets.push({
              productId: product.id,
              variantId: v.id,
              currentStock: v.stock,
            });
          }
        } else if (!product.isInactiveProduct) {
          // Simple product without variants
          targets.push({
            productId: product.id,
            variantId: null,
            currentStock: product.stock,
          });
        }
        continue;
      }

      // Key is a variant ID (mobile per-variant selection)
      for (const p of products) {
        const variant = p.variants?.find((v) => v.id === keyStr);
        if (variant && variant.isActive) {
          targets.push({
            productId: p.id,
            variantId: variant.id,
            currentStock: variant.stock,
          });
          break;
        }
      }
    }

    // Deduplicate (in case same variant ends up twice)
    const seen = new Set<string>();
    const uniqueTargets = targets.filter((t) => {
      const k = `${t.productId}:${t.variantId ?? ""}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    for (const { productId, variantId, currentStock } of uniqueTargets) {
      try {
        await updateInventory({
          product_id: productId,
          ...(variantId ? { variant_id: variantId } : {}),
          quantity_available: value === 0 ? 0 : currentStock + value,
        });
      } catch (err) {
        console.error(`Failed to update ${productId}/${variantId}:`, err);
      }
    }

    setEditedStocks({});
    setSelectedRowKeys([]);
    setBulkActive(false);
    await refreshProducts();
  };

  const handleBulkUpdate = async (value: number) => {
    if (selectedRowKeys.length === 0) return;

    if (value === 0) {
      return new Promise<void>((resolve) => {
        modal.confirm({
          title: "Set quantity to 0?",
          content: `Are you sure you want to set the quantity of ${selectedRowKeys.length} selected item(s) to 0?`,
          okText: "Yes, Set to 0",
          cancelText: "Cancel",
          okType: "danger",
          onOk: async () => {
            await bulkUpdate(0);
            resolve();
          },
          onCancel: () => resolve(),
        });
      });
    }

    await bulkUpdate(value);
  };

  // --- Row selection (desktop table only) ---
  const rowSelection: TableRowSelection<ProductRow | VariantRow> = {
    selectedRowKeys,
    onChange: (keys) => {
      setSelectedRowKeys(keys);
    },
    getCheckboxProps: (record) => {
      const isTopLevelProduct = "variants" in record;
      const hasVariants = isTopLevelProduct && !!record.variants?.length;
      // Products WITH variants: disable the parent checkbox — variants are
      // selected individually via the expanded row's own rowSelection.
      // Products WITHOUT variants (simple): allow direct selection.
      // Variant rows (nested): never appear here, but disable just in case.
      return {
        disabled: hasVariants || !isTopLevelProduct,
      };
    },
  };

  if (userLoading)
    return <p className="text-center text-muted-foreground">Loading user...</p>;
  if (!storeSlug)
    return (
      <p className="text-center text-muted-foreground">
        No store found for this user.
      </p>
    );

  return (
    <div className="space-y-4">
      {products.length === 0 && !loading ? (
        <p className="text-center text-muted-foreground">No products found.</p>
      ) : (
        <>
          <LowStockSummary products={products} />
          <BulkStockUpdate
            selectedCount={selectedRowKeys.length}
            onUpdate={handleBulkUpdate}
            loading={bulkActive}
          />
          <div className="block md:hidden">
            <StockTableMobile
              products={products}
              editedStocks={editedStocks}
              onStockChange={handleStockChange}
              onSingleUpdate={handleSingleUpdate}
              selectedRowKeys={selectedRowKeys}
              onSelectChange={setSelectedRowKeys}
              bulkActive={bulkActive}
            />
          </div>
          <div className="hidden md:block">
            <StockTable
              products={products}
              editedStocks={editedStocks}
              onStockChange={handleStockChange}
              onSingleUpdate={handleSingleUpdate}
              rowSelection={rowSelection}
              loading={loading}
              bulkActive={bulkActive}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default StockChangeTable;
