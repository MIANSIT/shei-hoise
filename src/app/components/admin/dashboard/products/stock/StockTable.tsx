"use client";

import React from "react";
import type { ColumnsType } from "antd/es/table";
import type { TableRowSelection } from "antd/es/table/interface";
import DataTable from "@/app/components/admin/common/DataTable";
import Image from "next/image";
import { InputNumber, Tooltip } from "antd";
import SheiButton from "@/app/components/ui/SheiButton/SheiButton";
import {
  ProductRow,
  VariantRow,
} from "@/lib/hook/products/stock/mapProductsForTable";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { ProductStatus } from "@/lib/types/enums";

interface StockTableProps {
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
  rowSelection?: TableRowSelection<ProductRow | VariantRow>;
  loading?: boolean;
  bulkActive?: boolean;
}

/* ── Shared badge component ── */
const Badge = ({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "out" | "low" | "draft" | "inactive";
}) => {
  const tones = {
    out: "bg-red-50    dark:bg-red-950/40    text-red-500    dark:text-red-400    ring-red-200    dark:ring-red-800/50",
    low: "bg-amber-50  dark:bg-amber-950/40  text-amber-600  dark:text-amber-400  ring-amber-200  dark:ring-amber-800/50",
    draft:
      "bg-yellow-50 dark:bg-yellow-950/40 text-yellow-600 dark:text-yellow-400 ring-yellow-200 dark:ring-yellow-800/50",
    inactive:
      "bg-gray-100  dark:bg-gray-800      text-gray-500   dark:text-gray-400   ring-gray-200   dark:ring-gray-700",
  };
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium ring-1 ring-inset ${tones[tone]}`}
    >
      {children}
    </span>
  );
};

const StockTable: React.FC<StockTableProps> = ({
  products,
  editedStocks,
  onStockChange,
  onSingleUpdate,
  rowSelection,
  loading,
  bulkActive = false,
}) => {
  const { icon: currencyIcon, loading: currencyLoading } =
    useUserCurrencyIcon();
  const symbol = currencyLoading ? "৳" : (currencyIcon ?? "৳");

  // Helper: toggle ALL active variants for a product
  const toggleAllVariants = (product: ProductRow) => {
    if (!rowSelection?.onChange || !rowSelection?.selectedRowKeys) return;
    const current = rowSelection.selectedRowKeys as string[];
    const activeIds = (product.variants ?? [])
      .filter((v) => v.isActive)
      .map((v) => v.id);
    const allSelected = activeIds.every((id) => current.includes(id));
    const withoutThese = current.filter((k) => !activeIds.includes(k));
    const next = allSelected ? withoutThese : [...withoutThese, ...activeIds];
    rowSelection.onChange(next, [], { type: "single" as const });
  };

  const columns: ColumnsType<ProductRow | VariantRow> = [
    /* ── Image ── */
    {
      title: "",
      key: "image",
      width: 64,
      render: (_v, record) => {
        const isProduct = "variants" in record;
        const hasIssue = isProduct
          ? !record.isOutOfStock &&
            (record.isLowStock ||
              record.hasLowStockVariant ||
              record.hasOutOfStockVariant)
          : !record.isOutOfStock && record.isLowStock;

        return (
          <div className="relative w-10 h-10">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
              {record.imageUrl ? (
                <Image
                  src={record.imageUrl}
                  alt={record.title}
                  width={40}
                  height={40}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-gray-300 dark:text-gray-600"
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
            {hasIssue && (
              <Tooltip
                title={
                  isProduct
                    ? (record as ProductRow).hasOutOfStockVariant &&
                      (record as ProductRow).hasLowStockVariant
                      ? "Has out of stock & low stock variants"
                      : (record as ProductRow).hasOutOfStockVariant
                        ? "Has out of stock variants"
                        : "Has low stock variants"
                    : `Threshold: ${record.lowStockThreshold}`
                }
              >
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 dark:bg-amber-400 rounded-full flex items-center justify-center">
                  <span className="text-white text-[9px] font-bold leading-none">
                    !
                  </span>
                </div>
              </Tooltip>
            )}
          </div>
        );
      },
    },

    /* ── Name ── */
    {
      title: "Product",
      dataIndex: "title",
      key: "title",
      render: (title: string, record) => {
        const isProduct = "variants" in record;
        const isInactive = isProduct
          ? record.isInactiveProduct
          : !(record as VariantRow).isActive;

        return (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {title}
            </span>
            <div className="flex flex-wrap gap-1">
              {/* Simple product: out of stock */}
              {record.isOutOfStock && <Badge tone="out">Out of stock</Badge>}

              {/* Simple product: low stock */}
              {!record.isOutOfStock && record.isLowStock && (
                <Badge tone="low">Low stock</Badge>
              )}

              {/* Product with variants: some variants out of stock */}
              {isProduct && (record as ProductRow).hasOutOfStockVariant && (
                <Badge tone="out">Has out of stock</Badge>
              )}

              {/* Product with variants: some variants low stock */}
              {isProduct && (record as ProductRow).hasLowStockVariant && (
                <Badge tone="low">Has low stock</Badge>
              )}

              {isInactive && (
                <Badge
                  tone={
                    isProduct && record.status === ProductStatus.DRAFT
                      ? "draft"
                      : "inactive"
                  }
                >
                  {isProduct && record.status === ProductStatus.DRAFT
                    ? "Draft"
                    : "Inactive"}
                </Badge>
              )}
            </div>
          </div>
        );
      },
    },

    /* ── SKU ── */
    {
      title: "SKU",
      dataIndex: "sku",
      key: "sku",
      render: (_sku, record) => {
        if ("variants" in record && record.variants?.length) {
          return (
            <span className="text-xs text-gray-400 dark:text-gray-500 italic">
              varies
            </span>
          );
        }
        return (
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
            {record.sku ?? "—"}
          </span>
        );
      },
    },

    /* ── Price ── */
    {
      title: "Price",
      dataIndex: "currentPrice",
      key: "currentPrice",
      render: (_price, record) => {
        if ("variants" in record && record.variants?.length) {
          return (
            <span className="text-xs text-gray-400 dark:text-gray-500 italic">
              varies
            </span>
          );
        }
        const price = record.currentPrice ?? 0;
        return (
          <span className="text-sm text-gray-700 dark:text-gray-300">
            <span className="text-gray-400 dark:text-gray-500 text-xs mr-0.5">
              {symbol}
            </span>
            {price.toFixed(2)}
          </span>
        );
      },
    },

    /* ── Stock ── */
    {
      title: "Stock",
      key: "stock",
      render: (_v, record) => {
        const isProduct = "variants" in record;
        const parentId = isProduct
          ? record.id
          : (record as VariantRow).productId;
        const variantId = isProduct ? null : record.id;

        if (isProduct && record.variants?.length) {
          return (
            <span className="text-xs text-gray-400 dark:text-gray-500 italic">
              managed in variants
            </span>
          );
        }

        const key = record.id;
        const editedValue = editedStocks[key] ?? record.stock;
        const showSave = key in editedStocks && !bulkActive;

        return (
          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <InputNumber
              min={0}
              value={editedValue}
              controls={false}
              onChange={(value) =>
                onStockChange(parentId, variantId, Number(value ?? 0))
              }
              className={`
                w-20! rounded-lg!
                [&_input]:text-center! [&_input]:font-semibold! [&_input]:text-sm!
                ${
                  record.isOutOfStock
                    ? "bg-gray-50! dark:bg-gray-800/60! [&_input]:text-gray-400!"
                    : record.isLowStock
                      ? "bg-amber-50! dark:bg-amber-950/30! border-amber-300! dark:border-amber-700/50! [&_input]:text-amber-700! dark:[&_input]:text-amber-400!"
                      : "dark:[&_input]:text-gray-200!"
                }
              `}
            />

            {showSave && (
              <SheiButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onSingleUpdate(parentId, variantId, editedValue);
                }}
              >
                Save
              </SheiButton>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={products}
      rowKey="id"
      rowSelection={rowSelection}
      pagination={false}
      loading={loading}
      rowClassName={(record) => {
        if (record.isOutOfStock) {
          return "opacity-60 dark:opacity-50";
        }
        const isLow =
          "variants" in record
            ? record.isLowStock ||
              record.hasLowStockVariant ||
              record.hasOutOfStockVariant
            : record.isLowStock;
        return isLow
          ? "bg-amber-50/40 dark:bg-amber-950/10 hover:bg-amber-50 dark:hover:bg-amber-950/20"
          : "";
      }}
      expandable={{
        expandedRowRender: (record) => {
          if (!("variants" in record) || !record.variants?.length) return null;

          const selectedKeys = (rowSelection?.selectedRowKeys ??
            []) as string[];
          const activeVariantIds = record.variants
            .filter((v) => v.isActive)
            .map((v) => v.id);
          const allSelected =
            activeVariantIds.length > 0 &&
            activeVariantIds.every((id) => selectedKeys.includes(id));
          const someSelected = activeVariantIds.some((id) =>
            selectedKeys.includes(id),
          );

          // Per-variant row selection wired into the shared selectedRowKeys
          const variantRowSelection: TableRowSelection<
            ProductRow | VariantRow
          > = {
            selectedRowKeys: selectedKeys,
            columnWidth: 48,
            onChange: (keys, _rows, info) => {
              if (!rowSelection?.onChange) return;
              const variantIds = record.variants!.map((v) => v.id);
              const otherKeys = selectedKeys.filter(
                (k) => !variantIds.includes(k),
              );
              rowSelection.onChange(
                [...otherKeys, ...(keys as string[])],
                [],
                info,
              );
            },
            getCheckboxProps: (variant) => ({
              disabled:
                !("isActive" in variant) || !(variant as VariantRow).isActive,
            }),
            columnTitle: (
              <Tooltip
                title={
                  allSelected
                    ? "Deselect all variants"
                    : "Select all active variants"
                }
              >
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected && !allSelected;
                  }}
                  onChange={() => toggleAllVariants(record)}
                  className="cursor-pointer accent-blue-500"
                />
              </Tooltip>
            ),
          };

          return (
            <div className="pl-14 pr-4 py-2">
              <DataTable
                columns={columns}
                data={record.variants.map((v) => ({
                  ...v,
                  productId: record.id,
                }))}
                rowKey="id"
                rowSelection={variantRowSelection}
                pagination={false}
                rowClassName={(v) => {
                  const isSelected = selectedKeys.includes(
                    (v as VariantRow).id,
                  );
                  if (isSelected) return "bg-blue-50/40 dark:bg-blue-950/10";
                  if (v.isOutOfStock) return "opacity-55";
                  if (v.isLowStock)
                    return "bg-amber-50/40 dark:bg-amber-950/10";
                  return "";
                }}
              />
            </div>
          );
        },
        rowExpandable: (record) =>
          "variants" in record && !!record.variants?.length,
      }}
    />
  );
};

export default StockTable;
