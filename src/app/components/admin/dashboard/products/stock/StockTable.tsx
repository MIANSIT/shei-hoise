"use client";

import React from "react";
import type { ColumnsType } from "antd/es/table";
import type { TableRowSelection } from "antd/es/table/interface";
import DataTable from "@/app/components/admin/common/DataTable";
import Image from "next/image";
import { InputNumber, Tag, Tooltip } from "antd";
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
  const displayCurrencyIconSafe = currencyLoading ? "৳" : (currencyIcon ?? "৳");

  const columns: ColumnsType<ProductRow | VariantRow> = [
    {
      title: "Image",
      key: "image",
      width: 80,
      render: (_value, record) => {
        const imageUrl = record.imageUrl ?? null;
        const isProductRow = "variants" in record;
        const shouldHighlight = isProductRow
          ? record.isLowStock || record.hasLowStockVariant
          : record.isLowStock;

        return (
          <div className="relative">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={record.title}
                width={50}
                height={50}
                className="rounded-md object-cover"
              />
            ) : (
              <div className="w-12 h-12 bg-card rounded-md" />
            )}
            {shouldHighlight && (
              <Tooltip
                title={
                  isProductRow && record.hasLowStockVariant
                    ? "Has low stock variants"
                    : `Low stock! Threshold: ${record.lowStockThreshold}`
                }
              >
                <div className="absolute -top-1 -right-1">
                  <div className="bg-red-500 text-foreground text-xs px-1 py-0.5 rounded-full">
                    !
                  </div>
                </div>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: "Product / Variant",
      dataIndex: "title",
      key: "title",
      className: "font-semibold text-primary",
      render: (title: string, record) => {
        const isProductRow = "variants" in record;
        const shouldHighlight = isProductRow
          ? record.isLowStock || record.hasLowStockVariant
          : record.isLowStock;

        const tooltipTitle =
          isProductRow && record.hasLowStockVariant
            ? "One or more variants are low on stock"
            : `Stock: ${record.stock} / Threshold: ${record.lowStockThreshold}`;

        const isInactiveProduct = isProductRow && record.isInactiveProduct;
        const isInactiveVariant = !isProductRow && !(record as VariantRow).isActive;

        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span>{title}</span>
              {shouldHighlight && (
                <Tooltip title={tooltipTitle}>
                  <Tag color="red" className="text-xs">
                    {isProductRow && record.hasLowStockVariant
                      ? "Has Low Stock"
                      : "Low Stock"}
                  </Tag>
                </Tooltip>
              )}
              {(isInactiveProduct || isInactiveVariant) && (
                <Tag
                  color={
                    isInactiveProduct
                      ? record.status === ProductStatus.DRAFT
                        ? "gold"
                        : "red"
                      : "red"
                  }
                  className="text-xs"
                >
                  {isInactiveProduct
                    ? record.status === ProductStatus.DRAFT
                      ? "Draft"
                      : "Inactive"
                    : "Inactive"}
                </Tag>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: "SKU",
      dataIndex: "sku",
      key: "sku",
      render: (_sku, record) => {
        if ("variants" in record && record.variants?.length) {
          return (
            <span className="italic text-muted-foreground">
              SKU depends on variants
            </span>
          );
        }
        return (
          <span className="text-muted-foreground">{record.sku ?? "—"}</span>
        );
      },
    },
    {
      title: "Price",
      dataIndex: "currentPrice",
      key: "currentPrice",
      render: (_price, record) => {
        if ("variants" in record && record.variants?.length) {
          return (
            <span className="italic text-muted-foreground">
              Price depends on variants
            </span>
          );
        }
        const price = record.currentPrice ?? 0;
        return (
          <span>
            {displayCurrencyIconSafe}
            {price.toFixed(2)}
          </span>
        );
      },
    },
    {
      title: "Stock",
      key: "stock",
      render: (_value, record) => {
        const isProductRow = "variants" in record;
        const parentId = isProductRow ? record.id : (record as VariantRow).productId;
        const variantId = isProductRow ? null : record.id;

        if (isProductRow && record.variants?.length) {
          return (
            <span className="italic text-muted-foreground">
              Stock managed in variants
            </span>
          );
        }

        const key = record.id;
        const editedValue = editedStocks[key] ?? record.stock;
        const showUpdateButton = key in editedStocks && !bulkActive;

        return (
          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <InputNumber
              min={0}
              value={editedValue}
              onChange={(value) =>
                onStockChange(parentId, variantId, Number(value ?? 0))
              }
              className={`w-20! text-center font-bold [&>input]:text-center [&>input]:font-bold ${
                record.isLowStock
                  ? "[&>input]:bg-red-50 [&>input]:border-red-300 [&>input]:text-red-700"
                  : ""
              }`}
              status={record.isLowStock ? "warning" : undefined}
            />
            {record.isLowStock && (
              <Tooltip title={`Below threshold (${record.lowStockThreshold})`}>
                <span className="text-xs text-red-500 font-medium px-2 py-1 bg-red-50 rounded">
                  Low
                </span>
              </Tooltip>
            )}
            {showUpdateButton && (
              <SheiButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onSingleUpdate(parentId, variantId, editedValue);
                }}
              >
                Update
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
        const shouldHighlight =
          "variants" in record
            ? record.isLowStock || record.hasLowStockVariant
            : record.isLowStock;
        return shouldHighlight
          ? "bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-800/20"
          : "";
      }}
      expandable={{
        expandedRowRender: (record) =>
          "variants" in record && record.variants?.length ? (
            <DataTable
              columns={columns.map((col) => ({
                ...col,
                width:
                  col.key === "image"
                    ? 50
                    : col.key === "title"
                      ? 150
                      : col.width,
              }))}
              data={record.variants.map((v) => ({
                ...v,
                productId: record.id,
              }))}
              rowKey="id"
              pagination={false}
              rowClassName={(variantRecord) => {
                const isVariantInactive =
                  !("variants" in variantRecord) &&
                  "isActive" in variantRecord &&
                  !variantRecord.isActive;
                return isVariantInactive
                  ? "bg-gray-100 hover:bg-gray-200"
                  : variantRecord.isLowStock
                    ? "bg-red-50 hover:bg-red-100"
                    : "";
              }}
            />
          ) : null,
        rowExpandable: (record) =>
          "variants" in record && !!record.variants?.length,
      }}
    />
  );
};

export default StockTable;
