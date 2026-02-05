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
      // Refetch after update
      const result = await getProductWithStock(
        storeSlug!,
        searchText,
        stockFilter,
        currentPage,
        pageSize,
      );
      setProducts(mapProductsForModernTable(result.data));
      if (onTotalChange) onTotalChange(result.total);
    } catch (err) {
      console.error(err);
      notify.error("Failed to update stock");
    }
  };

  // --- Bulk update ---
  const bulkUpdate = async (value: number) => {
    setBulkActive(true);

    for (const key of selectedRowKeys) {
      const product = products.find((p) => p.id === key);
      if (!product) continue;

      try {
        if (product.variants?.length) {
          for (const v of product.variants.filter((v) => v.isActive)) {
            await updateInventory({
              product_id: product.id,
              variant_id: v.id,
              quantity_available: value === 0 ? 0 : v.stock + value,
            });
          }
        } else if (!product.isInactiveProduct) {
          await updateInventory({
            product_id: product.id,
            quantity_available: value === 0 ? 0 : product.stock + value,
          });
        }
      } catch (err) {
        console.error(`Failed to update ${product.title}:`, err);
      }
    }

    setEditedStocks({});
    setSelectedRowKeys([]);
    setBulkActive(false);

    // Refetch after bulk update
    if (storeSlug) {
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
        notify.error("Failed to fetch products after bulk update");
      }
    }
  };

  const handleBulkUpdate = async (value: number) => {
    if (selectedRowKeys.length === 0) return;

    if (value === 0) {
      return new Promise<void>((resolve) => {
        modal.confirm({
          title: "Set quantity to 0?",
          content: `Are you sure you want to set the quantity of ${selectedRowKeys.length} selected product(s) to 0?`,
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

  // --- Row selection ---
  const rowSelection: TableRowSelection<ProductRow | VariantRow> = {
    selectedRowKeys,
    onChange: (keys) => {
      setSelectedRowKeys(keys);
    },
    getCheckboxProps: (record) => ({
      // Only allow selecting top-level products with variants
      disabled: !(
        "variants" in record &&
        record.variants &&
        record.variants.length > 0
      ),
    }),
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
