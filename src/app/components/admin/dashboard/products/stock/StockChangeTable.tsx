"use client";

import React, { useEffect, useState } from "react";
import {
  getProductWithStock,
  type StockAggregateStats,
  type StockSort,
} from "@/lib/queries/products/getProductWithStock";
import StockTableMobile from "./StockTableMobile";
import StockTable from "./StockTable";
import { BulkSupplierAssign } from "./BulkSupplierAssign";
import { BulkReorderAdd } from "./BulkReorderAdd";
import { useReorderListStore } from "@/lib/store/reorderListStore";
import { assignSupplierToProducts } from "@/lib/queries/supplier/suppliers";
import type { Supplier } from "@/lib/queries/supplier/supplierTypes";
import { addSupplierEntry } from "@/lib/queries/supplier/supplierLedger";
import { usePermissions } from "@/lib/context/PermissionsContext";
import dayjs from "dayjs";
import type { QuickAddBill } from "./QuickAddStock";
import BulkStockUpdate, { type BulkBillLine } from "./BulkStockUpdate";
import {
  mapProductsForModernTable,
  ProductRow,
  VariantRow,
} from "@/lib/hook/products/stock/mapProductsForTable";
import {
  updateInventory,
  adjustInventory,
} from "@/lib/queries/inventory/updateInventory";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import type { TableRowSelection } from "antd/es/table/interface";
import { App } from "antd";
import { StockFilter } from "@/lib/types/enums";
import type { StockInsightLookup } from "@/lib/queries/stock/stockInsightTypes";
import { useTranslation } from "@/lib/hook/useTranslation";

interface StockChangeTableProps {
  searchText: string;
  stockFilter: StockFilter;
  currentPage: number;
  pageSize: number;
  stockSort?: StockSort;
  onTotalChange?: (total: number) => void;
  onStatsChange?: (stats: StockAggregateStats) => void;
  onSortChange?: (sort: StockSort) => void;
  /** Stores with branches: show and change this branch's stock (null = store total). */
  branchId?: string | null;
  /** "All branches" view: numbers only, no editing (a change needs a branch). */
  readOnly?: boolean;
  /** Sales speed per product and variant, for the "Selling" column. */
  insights?: StockInsightLookup | null;
  /** Show only these products (the Restock / Slow / Not selling filters). */
  onlyProductIds?: ReadonlySet<string> | null;
  /** Called after stock was added or changed, so figures built from sales and stock can refresh. */
  onStockChanged?: () => void;
  /** Leave these products out (the "No supplier" filter). */
  excludeProductIds?: ReadonlySet<string> | null;
  /** The store's suppliers, for the "Set supplier" bar. */
  suppliers?: readonly Supplier[];
  /** Product id → supplier id, for the supplier chip on each row. */
  supplierByProduct?: Readonly<Record<string, string>>;
  /** Can this person give products a supplier (needs the stock edit permission)? */
  canAssignSupplier?: boolean;
  /** Called after suppliers were assigned, so the map above reloads. */
  onSuppliersChanged?: () => void;
  /** Can this person put products on the reorder list (needs the sales-speed permission)? */
  canReorder?: boolean;
}

const StockChangeTable: React.FC<StockChangeTableProps> = ({
  searchText,
  stockFilter,
  currentPage,
  pageSize,
  stockSort = null,
  onTotalChange,
  onStatsChange,
  onSortChange,
  branchId = null,
  readOnly = false,
  insights = null,
  onlyProductIds = null,
  onStockChanged,
  excludeProductIds = null,
  suppliers = [],
  supplierByProduct = {},
  canAssignSupplier = false,
  onSuppliersChanged,
  canReorder = false,
}) => {
  const t = useTranslation();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [editedStocks, setEditedStocks] = useState<Record<string, number>>({});
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkActive, setBulkActive] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const { user, storeSlug, loading: userLoading } = useCurrentUser();
  const { can } = usePermissions();
  const canSupplierMoney = can("stock.supplier_money");
  const notify = useSheiNotification();
  const { modal } = App.useApp();

  // --- Fetch products ---
  useEffect(() => {
    // Only the newest request may update the table — an older, slower
    // response (e.g. for a shorter search) must not overwrite newer results.
    let stale = false;
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
          stockSort,
          branchId,
          onlyProductIds ? [...onlyProductIds] : null,
          excludeProductIds ? [...excludeProductIds] : null,
        );

        if (stale) return;
        const mapped: ProductRow[] = mapProductsForModernTable(result.data);
        setProducts(mapped);
        if (onTotalChange) onTotalChange(result.total);
        if (onStatsChange) onStatsChange(result.stats);
      } catch (err) {
        if (stale) return;
        console.error(err);
        notify.error("Failed to fetch products");
      } finally {
        if (!stale) setLoading(false);
      }
    };

    if (!userLoading && storeSlug) fetchProducts();
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    userLoading,
    storeSlug,
    searchText,
    stockFilter,
    currentPage,
    pageSize,
    stockSort,
    branchId,
    onlyProductIds,
    excludeProductIds,
    onTotalChange,
    onStatsChange,
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
        stockSort,
        branchId,
        onlyProductIds ? [...onlyProductIds] : null,
        excludeProductIds ? [...excludeProductIds] : null,
      );
      setProducts(mapProductsForModernTable(result.data));
      if (onTotalChange) onTotalChange(result.total);
      if (onStatsChange) onStatsChange(result.stats);
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

    // The input shows/edits the running total, but we never send that total
    // as a blind overwrite. Instead we send the *difference* from what was
    // last loaded, and the server applies it atomically on top of whatever
    // the real current value is (e.g. after a sale changed it meanwhile) —
    // so "2 in stock, type 4" is always applied as "+2", not "force to 4".
    const currentStock = variantId
      ? (product.variants?.find((v) => v.id === variantId)?.stock ?? 0)
      : product.stock;
    const delta = quantity - currentStock;

    if (delta === 0) {
      setEditedStocks((prev) => {
        const copy = { ...prev };
        delete copy[variantId ?? productId];
        return copy;
      });
      return;
    }

    try {
      await adjustInventory({
        product_id: productId,
        ...(variantId ? { variant_id: variantId } : {}),
        branch_id: branchId,
        delta,
        created_by: user?.id ?? null,
      });

      setEditedStocks((prev) => {
        const copy = { ...prev };
        delete copy[variantId ?? productId];
        return copy;
      });

      notify.success("Stock updated successfully");
      await refreshProducts();
      onStockChanged?.();
    } catch (err) {
      console.error(err);
      notify.error(
        err instanceof Error ? err.message : "Failed to update stock",
      );
    }
  };

  // --- "Stock arrived": add units on top of what is there ---
  // The bill Add stock can add to the product's supplier: only for people who may add supplier bills.
  const getQuickAddBill = (productId: string, variantId: string | null): QuickAddBill | null => {
    if (!canSupplierMoney) return null;
    const supplierId = supplierByProduct[productId];
    const supplier = supplierId ? suppliers.find((s) => s.id === supplierId) : undefined;
    if (!supplier) return null;
    const product = products.find((p) => p.id === productId);
    const unitCost = variantId
      ? (product?.variants?.find((v) => v.id === variantId)?.tpPrice ?? null)
      : (product?.tpPrice ?? null);
    return { supplierName: supplier.name, unitCost };
  };

  const handleQuickAdd = async (
    productId: string,
    variantId: string | null,
    quantity: number,
    billAmount: number | null,
  ) => {
    try {
      await adjustInventory({
        product_id: productId,
        ...(variantId ? { variant_id: variantId } : {}),
        branch_id: branchId,
        delta: quantity,
        reason: "restock",
        created_by: user?.id ?? null,
      });

      // The stock is in; now add what is owed for it. A failed bill never undoes the stock.
      let billFailed = false;
      const supplierId = supplierByProduct[productId];
      if (billAmount && supplierId && user?.store_id) {
        const product = products.find((p) => p.id === productId);
        const variant = variantId ? product?.variants?.find((v) => v.id === variantId) : undefined;
        const name = variant ? `${product?.title ?? ""} ${variant.title}`.trim() : (product?.title ?? "");
        const bill = await addSupplierEntry(user.store_id, {
          supplierId,
          kind: "bill",
          amount: billAmount,
          date: dayjs().format("YYYY-MM-DD"),
          note: t.admin.shAddBillNote.replace("{product}", name).replace("{qty}", String(quantity)),
        });
        billFailed = !bill.success;
      }

      if (billFailed) notify.error(t.admin.shAddBillFailed);
      else notify.success(billAmount ? t.admin.shAddBillDone : t.admin.shAddStockDone);
      await refreshProducts();
      onStockChanged?.();
    } catch (err) {
      console.error(err);
      notify.error(err instanceof Error ? err.message : t.admin.shAddStockFailed);
    }
  };

  // --- Give the ticked products a supplier ---
  // A ticked key is a product id or (on variant rows) a variant id; either way
  // the supplier belongs to the product.
  const selectedProductIds = (): string[] => {
    const ids = new Set<string>();
    for (const key of selectedRowKeys) {
      const keyStr = key as string;
      const product = products.find((p) => p.id === keyStr || p.variants?.some((v) => v.id === keyStr));
      if (product) ids.add(product.id);
    }
    return [...ids];
  };

  const handleAssignSupplier = async (supplierId: string | null) => {
    if (!user?.store_id) return;
    const ids = selectedProductIds();
    if (ids.length === 0) return;
    setAssigning(true);
    try {
      const result = await assignSupplierToProducts(user.store_id, ids, supplierId);
      if (!result.success) {
        notify.error(result.error ?? t.admin.spAssignFailed);
        return;
      }
      notify.success(t.admin.spAssignDone);
      setSelectedRowKeys([]);
      onSuppliersChanged?.();
    } finally {
      setAssigning(false);
    }
  };

  // --- Put products on the reorder list ---
  const addToReorderList = useReorderListStore((s) => s.addItems);

  // Ticked rows as items: a ticked product id is a simple product (or every active variant of one
  // that has variants); a ticked variant id is just that variant.
  const selectedSkus = (): { productId: string; variantId: string | null }[] => {
    const skus: { productId: string; variantId: string | null }[] = [];
    for (const key of selectedRowKeys) {
      const keyStr = key as string;
      const product = products.find((p) => p.id === keyStr);
      if (product) {
        const active = (product.variants ?? []).filter((v) => v.isActive);
        if (active.length > 0) for (const v of active) skus.push({ productId: product.id, variantId: v.id });
        else skus.push({ productId: product.id, variantId: null });
        continue;
      }
      for (const p of products) {
        const variant = p.variants?.find((v) => v.id === keyStr);
        if (variant) {
          skus.push({ productId: p.id, variantId: variant.id });
          break;
        }
      }
    }
    return skus;
  };

  const handleAddToReorder = (items: { productId: string; variantId: string | null }[]) => {
    if (!user?.store_id || items.length === 0) return;
    const added = addToReorderList(user.store_id, items);
    notify.success(
      added > 0 ? t.admin.roAddedCount.replace("{n}", String(added)) : t.admin.roAlreadyInList,
    );
  };

  const supplierNameById = new Map(suppliers.map((s) => [s.id, s.name]));
  const supplierNames: Record<string, string> = {};
  for (const [productId, supplierId] of Object.entries(supplierByProduct)) {
    const name = supplierNameById.get(supplierId);
    if (name) supplierNames[productId] = name;
  }

  // --- Bulk update ---
  // selectedRowKeys can be:
  //   - product IDs (desktop: top-level products without variants, or products with variants)
  //   - variant IDs (mobile: individually selected variants)
  type UpdateTarget = {
    productId: string;
    variantId: string | null;
  };

  // A flat list of { productId, variantId | null } for the ticked rows.
  const bulkTargets = (): UpdateTarget[] => {
    const targets: UpdateTarget[] = [];

    for (const key of selectedRowKeys) {
      const keyStr = key as string;

      // Check if key is a product ID
      const product = products.find((p) => p.id === keyStr);
      if (product) {
        if (product.variants?.length) {
          // Desktop path: product with variants → update all active variants
          for (const v of product.variants.filter((v) => v.isActive)) {
            targets.push({ productId: product.id, variantId: v.id });
          }
        } else if (!product.isInactiveProduct) {
          // Simple product without variants
          targets.push({ productId: product.id, variantId: null });
        }
        continue;
      }

      // Key is a variant ID (mobile per-variant selection)
      for (const p of products) {
        const variant = p.variants?.find((v) => v.id === keyStr);
        if (variant && variant.isActive) {
          targets.push({ productId: p.id, variantId: variant.id });
          break;
        }
      }
    }

    // Deduplicate (in case same variant ends up twice)
    const seen = new Set<string>();
    return targets.filter((t) => {
      const k = `${t.productId}:${t.variantId ?? ""}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  /** What one unit of a product or variant costs the shop, or null when no cost price is set. */
  const unitCostOf = (productId: string, variantId: string | null): number | null => {
    const product = products.find((p) => p.id === productId);
    return variantId ? (product?.variants?.find((v) => v.id === variantId)?.tpPrice ?? null) : (product?.tpPrice ?? null);
  };

  /** Supplier id → what is owed for adding `value` units to each of these (units × cost price). Suppliers with nothing to bill are left out. */
  const billsBySupplier = (targets: readonly UpdateTarget[], value: number): Map<string, number> => {
    const bills = new Map<string, number>();
    if (!canSupplierMoney || value <= 0) return bills;
    for (const { productId, variantId } of targets) {
      const supplierId = supplierByProduct[productId];
      const cost = unitCostOf(productId, variantId);
      if (!supplierId || !cost || cost <= 0) continue;
      bills.set(supplierId, (bills.get(supplierId) ?? 0) + value * cost);
    }
    for (const [supplierId, amount] of bills) bills.set(supplierId, Math.round(amount * 100) / 100);
    return bills;
  };

  /** The bills a bulk add of `value` units would create, for the bar to show before it is applied. */
  const getBulkBillPreview = (value: number): BulkBillLine[] =>
    [...billsBySupplier(bulkTargets(), value)].map(([supplierId, amount]) => ({
      supplierName: supplierNameById.get(supplierId) ?? "",
      amount,
    }));

  const bulkUpdate = async (value: number, addBills: boolean) => {
    setBulkActive(true);
    const uniqueTargets = bulkTargets();
    const succeeded: UpdateTarget[] = [];

    // Each target is written atomically server-side (row-locked +/- for
    // adjustments, row-locked absolute set for "set to 0") — no client-side
    // "read current, compute new, overwrite" step, so this is race-safe even
    // if stock is changing concurrently (e.g. a sale coming through).
    let failures = 0;
    for (const { productId, variantId } of uniqueTargets) {
      try {
        if (value === 0) {
          await updateInventory({
            product_id: productId,
            ...(variantId ? { variant_id: variantId } : {}),
            quantity_available: 0,
            branch_id: branchId,
            reason: "bulk_set_zero",
            created_by: user?.id ?? null,
          });
        } else {
          await adjustInventory({
            product_id: productId,
            ...(variantId ? { variant_id: variantId } : {}),
            delta: value,
            branch_id: branchId,
            reason: "bulk_adjustment",
            created_by: user?.id ?? null,
          });
        }
        succeeded.push({ productId, variantId });
      } catch (err) {
        failures++;
        console.error(`Failed to update ${productId}/${variantId}:`, err);
      }
    }

    if (failures > 0) {
      notify.error(
        `${failures} item${failures !== 1 ? "s" : ""} failed to update (e.g. insufficient stock).`,
      );
    }

    // Bill each supplier for what really went in (items that failed are left out). A failed
    // bill never undoes the stock.
    if (addBills && user?.store_id) {
      const storeId = user.store_id;
      const lines = [...billsBySupplier(succeeded, value)];
      const results = await Promise.all(
        lines.map(([supplierId, amount]) =>
          addSupplierEntry(storeId, {
            supplierId,
            kind: "bill",
            amount,
            date: dayjs().format("YYYY-MM-DD"),
            note: t.admin.shBulkBillNote.replace("{qty}", String(value)),
          }),
        ),
      );
      if (results.some((r) => !r.success)) notify.error(t.admin.shAddBillFailed);
      else if (lines.length > 0) notify.success(t.admin.shBulkBillDone.replace("{n}", String(lines.length)));
    }

    setEditedStocks({});
    setSelectedRowKeys([]);
    setBulkActive(false);
    await refreshProducts();
  };

  const handleBulkUpdate = async (value: number, addBills: boolean) => {
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
            await bulkUpdate(0, false);
            resolve();
          },
          onCancel: () => resolve(),
        });
      });
    }

    await bulkUpdate(value, addBills);
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
        disabled: readOnly || hasVariants || !isTopLevelProduct,
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
          {!readOnly && (
            <BulkStockUpdate
              selectedCount={selectedRowKeys.length}
              onUpdate={handleBulkUpdate}
              getBillPreview={getBulkBillPreview}
              loading={bulkActive}
            />
          )}
          {canReorder && (
            <BulkReorderAdd
              selectedCount={selectedSkus().length}
              onAdd={() => {
                handleAddToReorder(selectedSkus());
                setSelectedRowKeys([]);
              }}
            />
          )}
          {canAssignSupplier && (
            <BulkSupplierAssign
              selectedCount={selectedProductIds().length}
              suppliers={suppliers}
              onAssign={handleAssignSupplier}
              loading={assigning}
            />
          )}
          {/* A disabled fieldset disables every input and button inside it —
              fine for the mobile cards, but on the desktop table it would also
              kill the row-expand arrow, the sort header and the history
              popover, so that table disables only its editing controls. */}
          <fieldset disabled={readOnly} className="contents">
            <div className="block md:hidden">
              <StockTableMobile
                products={products}
                editedStocks={editedStocks}
                onStockChange={handleStockChange}
                onSingleUpdate={handleSingleUpdate}
                selectedRowKeys={selectedRowKeys}
                onSelectChange={setSelectedRowKeys}
                bulkActive={bulkActive}
                insights={insights}
                onQuickAdd={handleQuickAdd}
                getQuickAddBill={getQuickAddBill}
                supplierNames={supplierNames}
                onAddToReorder={canReorder ? (productId, variantId) => handleAddToReorder([{ productId, variantId }]) : undefined}
              />
            </div>
          </fieldset>
          <div className="hidden md:block">
            <StockTable
              products={products}
              editedStocks={editedStocks}
              onStockChange={handleStockChange}
              onSingleUpdate={handleSingleUpdate}
              rowSelection={rowSelection}
              loading={loading}
              bulkActive={bulkActive}
              readOnly={readOnly}
              stockSort={stockSort}
              onSortChange={onSortChange}
              insights={insights}
              onQuickAdd={handleQuickAdd}
              getQuickAddBill={getQuickAddBill}
              supplierNames={supplierNames}
              onAddToReorder={canReorder ? (productId, variantId) => handleAddToReorder([{ productId, variantId }]) : undefined}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default StockChangeTable;
