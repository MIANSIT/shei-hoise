"use client";

import React from "react";
import { InputNumber, Tooltip, Checkbox } from "antd";
import Image from "next/image";
import { ProductRow } from "@/lib/hook/products/stock/mapProductsForTable";
import SheiButton from "@/app/components/ui/SheiButton/SheiButton";
import { ProductStatus } from "@/lib/types/enums";

interface StockTableMobileProps {
  products: ProductRow[];
  editedStocks: Record<string, number>;
  onStockChange: (
    productId: string,
    variantId: string | null,
    value: number,
  ) => void;
  onSingleUpdate: (
    productId: string,
    variantId: string | null,
    quantity: number,
  ) => void;
  selectedRowKeys: React.Key[];
  onSelectChange: (keys: React.Key[]) => void;
  bulkActive?: boolean;
}

const StatusBadge = ({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: "out" | "low" | "draft" | "inactive";
}) => {
  const styles = {
    out: "bg-red-100    dark:bg-red-900/30    text-red-600    dark:text-red-400    border-red-200    dark:border-red-800/50",
    low: "bg-amber-100  dark:bg-amber-900/30  text-amber-700  dark:text-amber-400  border-amber-200  dark:border-amber-800/50",
    draft:
      "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/50",
    inactive:
      "bg-gray-100   dark:bg-gray-800      text-gray-500   dark:text-gray-400   border-gray-200   dark:border-gray-700",
  };
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium border ${styles[variant]}`}
    >
      {children}
    </span>
  );
};

const SkuChip = ({ sku }: { sku?: string | null }) => {
  if (!sku) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md border border-gray-200 dark:border-gray-700 leading-none">
      {sku}
    </span>
  );
};

const StockInput = ({
  value,
  isOut,
  isLow,
  threshold,
  onChange,
}: {
  value: number;
  isOut: boolean;
  isLow: boolean;
  threshold?: number;
  onChange: (v: number) => void;
}) => (
  <Tooltip title={isLow && threshold ? `Threshold: ${threshold}` : undefined}>
    <InputNumber
      min={0}
      value={value}
      onChange={(v) => onChange(Number(v ?? 0))}
      controls={false}
      className={`
        w-20! rounded-lg!
        [&_input]:text-center! [&_input]:font-semibold! [&_input]:text-sm!
        ${
          isOut
            ? "bg-gray-50! dark:bg-gray-800/60! [&_input]:text-gray-400! dark:[&_input]:text-gray-500!"
            : isLow
              ? "bg-amber-50! dark:bg-amber-950/30! [&_input]:text-amber-700! dark:[&_input]:text-amber-400! border-amber-300! dark:border-amber-700/60!"
              : "dark:[&_input]:text-gray-200!"
        }
      `}
    />
  </Tooltip>
);

const StockTableMobile: React.FC<StockTableMobileProps> = ({
  products,
  editedStocks,
  onStockChange,
  onSingleUpdate,
  selectedRowKeys,
  onSelectChange,
  bulkActive = false,
}) => {
  // A "selectable key" is either a productId (no variants) or a variantId (has variants)
  const toggleKey = (id: string) => {
    const newKeys = selectedRowKeys.includes(id)
      ? selectedRowKeys.filter((k) => k !== id)
      : [...selectedRowKeys, id];
    onSelectChange(newKeys);
  };

  // For a product with variants: toggle all active variant ids
  const toggleAllVariants = (product: ProductRow) => {
    const activeVariantIds = (product.variants ?? [])
      .filter((v) => v.isActive)
      .map((v) => v.id);

    const allSelected = activeVariantIds.every((id) =>
      selectedRowKeys.includes(id),
    );

    if (allSelected) {
      // Deselect all variants of this product
      onSelectChange(
        selectedRowKeys.filter((k) => !activeVariantIds.includes(k as string)),
      );
    } else {
      // Select all active variants
      const existing = selectedRowKeys.filter(
        (k) => !activeVariantIds.includes(k as string),
      );
      onSelectChange([...existing, ...activeVariantIds]);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {products.map((product) => {
        const hasVariants = !!product.variants?.length;
        const activeVariantIds = (product.variants ?? [])
          .filter((v) => v.isActive)
          .map((v) => v.id);

        // Selection state for the parent checkbox
        const parentSelected = hasVariants
          ? activeVariantIds.length > 0 &&
            activeVariantIds.every((id) => selectedRowKeys.includes(id))
          : selectedRowKeys.includes(product.id);

        const parentIndeterminate =
          hasVariants &&
          activeVariantIds.some((id) => selectedRowKeys.includes(id)) &&
          !parentSelected;

        return (
          <div
            key={product.id}
            className={`
              rounded-2xl border transition-all duration-150
              bg-white dark:bg-gray-900
              ${
                parentSelected || parentIndeterminate
                  ? "border-blue-400 dark:border-blue-600 shadow-sm shadow-blue-100 dark:shadow-blue-950/40"
                  : product.isOutOfStock
                    ? "border-gray-200 dark:border-gray-700/60 opacity-75"
                    : product.isLowStock || product.hasLowStockVariant
                      ? "border-amber-200 dark:border-amber-800/50"
                      : "border-gray-200 dark:border-gray-800"
              }
            `}
          >
            {/* Card header */}
            <div className="flex items-start gap-3 p-3">
              <div className="mt-0.5">
                <Checkbox
                  checked={parentSelected}
                  indeterminate={parentIndeterminate}
                  onChange={() =>
                    hasVariants
                      ? toggleAllVariants(product)
                      : toggleKey(product.id)
                  }
                />
              </div>

              {/* Thumbnail */}
              <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-gray-300 dark:text-gray-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"
                      />
                    </svg>
                  </div>
                )}
              </div>

              {/* Title + SKU + badges */}
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {product.title}
                </span>

                {/* SKU — shown for simple products (no variants) */}
                {!hasVariants && product.sku && <SkuChip sku={product.sku} />}

                <div className="flex flex-wrap gap-1">
                  {product.isOutOfStock && (
                    <StatusBadge variant="out">Out of stock</StatusBadge>
                  )}
                  {!product.isOutOfStock && product.isLowStock && (
                    <StatusBadge variant="low">Low stock</StatusBadge>
                  )}
                  {!product.isOutOfStock &&
                    product.hasLowStockVariant &&
                    !product.isLowStock && (
                      <StatusBadge variant="low">Has low stock</StatusBadge>
                    )}
                  {product.isInactiveProduct && (
                    <StatusBadge
                      variant={
                        product.status === ProductStatus.DRAFT
                          ? "draft"
                          : "inactive"
                      }
                    >
                      {product.status === ProductStatus.DRAFT
                        ? "Draft"
                        : "Inactive"}
                    </StatusBadge>
                  )}
                </div>
              </div>
            </div>

            {/* Simple product stock (no variants) */}
            {!hasVariants && (
              <div className="px-3 pb-3 flex items-center gap-2 border-t border-gray-100 dark:border-gray-800 pt-3">
                <StockInput
                  value={editedStocks[product.id] ?? product.stock}
                  isOut={product.isOutOfStock}
                  isLow={product.isLowStock}
                  threshold={product.lowStockThreshold}
                  onChange={(v) => onStockChange(product.id, null, v)}
                />
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  units
                </span>
                {product.id in editedStocks && !bulkActive && (
                  <SheiButton
                    size="small"
                    onClick={() =>
                      onSingleUpdate(product.id, null, editedStocks[product.id])
                    }
                    className="ml-auto"
                  >
                    Save
                  </SheiButton>
                )}
              </div>
            )}

            {/* Variants */}
            {hasVariants && (
              <div className="px-3 pb-3 space-y-1.5 border-t border-gray-100 dark:border-gray-800 pt-2.5">
                {product.variants!.map((variant) => {
                  const isVariantSelected = selectedRowKeys.includes(
                    variant.id,
                  );

                  return (
                    <div
                      key={variant.id}
                      className={`
                        flex items-center justify-between gap-2
                        px-3 py-2 rounded-xl
                        transition-all duration-150
                        ${
                          isVariantSelected
                            ? "bg-blue-50/60 dark:bg-blue-950/20 ring-1 ring-blue-300 dark:ring-blue-700/50"
                            : variant.isOutOfStock
                              ? "bg-gray-50 dark:bg-gray-800/60"
                              : variant.isLowStock
                                ? "bg-amber-50/60 dark:bg-amber-950/20"
                                : "bg-gray-50/60 dark:bg-gray-800/40"
                        }
                      `}
                    >
                      {/* Left: checkbox + title + SKU + badges */}
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <div className="mt-0.5 shrink-0">
                          <Checkbox
                            checked={isVariantSelected}
                            disabled={!variant.isActive}
                            onChange={() => toggleKey(variant.id)}
                            className={!variant.isActive ? "opacity-30" : ""}
                          />
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                            {variant.title}
                          </span>
                          {/* SKU per variant */}
                          {variant.sku && <SkuChip sku={variant.sku} />}
                          <div className="flex gap-1 flex-wrap">
                            {!variant.isActive && (
                              <StatusBadge variant="inactive">
                                Inactive
                              </StatusBadge>
                            )}
                            {variant.isOutOfStock && (
                              <StatusBadge variant="out">Out</StatusBadge>
                            )}
                            {!variant.isOutOfStock && variant.isLowStock && (
                              <StatusBadge variant="low">Low</StatusBadge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: stock input + save */}
                      <div className="flex items-center gap-2 shrink-0">
                        <StockInput
                          value={editedStocks[variant.id] ?? variant.stock}
                          isOut={variant.isOutOfStock}
                          isLow={variant.isLowStock}
                          threshold={variant.lowStockThreshold}
                          onChange={(v) =>
                            onStockChange(product.id, variant.id, v)
                          }
                        />
                        {variant.id in editedStocks && !bulkActive && (
                          <SheiButton
                            size="small"
                            onClick={() =>
                              onSingleUpdate(
                                product.id,
                                variant.id,
                                editedStocks[variant.id],
                              )
                            }
                          >
                            Save
                          </SheiButton>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StockTableMobile;
