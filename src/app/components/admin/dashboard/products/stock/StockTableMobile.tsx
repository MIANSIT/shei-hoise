"use client";

import React from "react";
import { InputNumber, Tooltip, Checkbox } from "antd";
import Image from "next/image";
import { ProductRow } from "@/lib/hook/products/stock/mapProductsForTable";
import SheiButton from "@/app/components/ui/SheiButton/SheiButton";
import { ProductStatus } from "@/lib/types/enums";
import { stockLevelPct } from "./StockTable";
import StockHistoryPopover from "./StockHistoryPopover";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";

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

const TpPriceChip = ({
  tpPrice,
  symbol,
}: {
  tpPrice: number | null;
  symbol: string;
}) => {
  if (tpPrice == null) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 leading-none">
      TP {symbol}
      {tpPrice.toFixed(2)}
    </span>
  );
};

const DeltaChip = ({ delta }: { delta: number }) => {
  if (delta === 0) return null;
  return (
    <span
      className={`text-[10.5px] font-bold px-1.5 py-0.5 rounded-md ${
        delta > 0
          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
          : "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
      }`}
    >
      {delta > 0 ? "+" : ""}
      {delta}
    </span>
  );
};

const StockInput = ({
  value,
  stock,
  isOut,
  isLow,
  threshold,
  onChange,
}: {
  value: number;
  stock: number;
  isOut: boolean;
  isLow: boolean;
  threshold?: number;
  onChange: (v: number) => void;
}) => {
  const gaugeTone = isOut
    ? "bg-red-400 dark:bg-red-500"
    : isLow
      ? "bg-amber-400 dark:bg-amber-500"
      : "bg-emerald-500 dark:bg-emerald-400";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="h-1 w-20 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div
          className={`h-full rounded-full ${gaugeTone}`}
          style={{ width: `${stockLevelPct(stock, threshold ?? 0)}%` }}
        />
      </div>
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
    </div>
  );
};

const StockTableMobile: React.FC<StockTableMobileProps> = ({
  products,
  editedStocks,
  onStockChange,
  onSingleUpdate,
  selectedRowKeys,
  onSelectChange,
  bulkActive = false,
}) => {
  const { icon: currencyIcon, loading: currencyLoading } = useUserCurrencyIcon();
  const symbol = currencyLoading ? "৳" : ((currencyIcon as string) ?? "৳");

  const toggleKey = (id: string) => {
    const newKeys = selectedRowKeys.includes(id)
      ? selectedRowKeys.filter((k) => k !== id)
      : [...selectedRowKeys, id];
    onSelectChange(newKeys);
  };

  const toggleAllVariants = (product: ProductRow) => {
    const activeVariantIds = (product.variants ?? [])
      .filter((v) => v.isActive)
      .map((v) => v.id);

    const allSelected = activeVariantIds.every((id) =>
      selectedRowKeys.includes(id),
    );

    if (allSelected) {
      onSelectChange(
        selectedRowKeys.filter((k) => !activeVariantIds.includes(k as string)),
      );
    } else {
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

        const parentSelected = hasVariants
          ? activeVariantIds.length > 0 &&
            activeVariantIds.every((id) => selectedRowKeys.includes(id))
          : selectedRowKeys.includes(product.id);

        const parentIndeterminate =
          hasVariants &&
          activeVariantIds.some((id) => selectedRowKeys.includes(id)) &&
          !parentSelected;

        const hasAnyVariantIssue =
          product.hasOutOfStockVariant || product.hasLowStockVariant;

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
                    : product.isLowStock || hasAnyVariantIssue
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

                {!hasVariants && (product.sku || product.tpPrice != null) && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <SkuChip sku={product.sku} />
                    <TpPriceChip tpPrice={product.tpPrice} symbol={symbol} />
                  </div>
                )}

                <div className="flex flex-wrap gap-1">
                  {/* Simple product: out of stock */}
                  {product.isOutOfStock && (
                    <StatusBadge variant="out">Out of stock</StatusBadge>
                  )}

                  {/* Simple product: low stock */}
                  {!product.isOutOfStock && product.isLowStock && (
                    <StatusBadge variant="low">Low stock</StatusBadge>
                  )}

                  {/* Product with variants: some variants out of stock */}
                  {product.hasOutOfStockVariant && (
                    <StatusBadge variant="out">Has out of stock</StatusBadge>
                  )}

                  {/* Product with variants: some variants low stock */}
                  {product.hasLowStockVariant && (
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
                  stock={product.stock}
                  isOut={product.isOutOfStock}
                  isLow={product.isLowStock}
                  threshold={product.lowStockThreshold}
                  onChange={(v) => onStockChange(product.id, null, v)}
                />
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  units
                </span>
                <DeltaChip
                  delta={(editedStocks[product.id] ?? product.stock) - product.stock}
                />
                <StockHistoryPopover productId={product.id} variantId={null} />
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
                          {(variant.sku || variant.tpPrice != null) && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <SkuChip sku={variant.sku} />
                              <TpPriceChip tpPrice={variant.tpPrice} symbol={symbol} />
                            </div>
                          )}
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
                          stock={variant.stock}
                          isOut={variant.isOutOfStock}
                          isLow={variant.isLowStock}
                          threshold={variant.lowStockThreshold}
                          onChange={(v) =>
                            onStockChange(product.id, variant.id, v)
                          }
                        />
                        <DeltaChip
                          delta={
                            (editedStocks[variant.id] ?? variant.stock) - variant.stock
                          }
                        />
                        <StockHistoryPopover
                          productId={product.id}
                          variantId={variant.id}
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
