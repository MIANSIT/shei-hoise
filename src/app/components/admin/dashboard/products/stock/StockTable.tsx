"use client";

import React from "react";
import type { ColumnsType } from "antd/es/table";
import type { TableRowSelection } from "antd/es/table/interface";
import DataTable from "@/app/components/admin/common/DataTable";
import Image from "next/image";
import { InputNumber } from "antd";
import SheiButton from "@/app/components/ui/SheiButton/SheiButton";
import {
  ProductRow,
  VariantRow,
} from "@/lib/hook/products/stock/mapProductsForTable";

interface StockTableProps {
  products: ProductRow[];
  editedStocks: Record<string, number>;
  onStockChange: (
    productId: string,
    variantId: string | null,
    value: number
  ) => void;
  onSingleUpdate: (
    productId: string,
    variantId: string | null,
    quantity: number
  ) => void;
  rowSelection?: TableRowSelection<ProductRow>;
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
  const columns: ColumnsType<ProductRow | VariantRow> = [
    {
      title: "Image",
      key: "image",
      width: 80,
      render: (_value, record) => {
        const imageUrl = record.imageUrl ?? null;

        return imageUrl ? (
          <Image
            src={imageUrl}
            alt={record.title}
            width={50}
            height={50}
            className="rounded-md object-cover"
          />
        ) : (
          <div className="w-12 h-12 bg-gray-200 rounded-md" />
        );
      },
    },
    {
      title: "Product / Variant",
      dataIndex: "title",
      key: "title",
      className: "font-semibold",
    },
    {
      title: "Price",
      dataIndex: "currentPrice",
      key: "currentPrice",
      render: (_price: number | null, record: ProductRow | VariantRow) => {
        // 🟡 If this record has variants → show message
        if ("variants" in record && record.variants?.length) {
          return (
            <span className="italic text-gray-400">
              Price depends on variants
            </span>
          );
        }

        // 🟢 For variant or product without variants → show proper price
        const price =
          typeof record.currentPrice === "number" ? record.currentPrice : 0;
        return <span>৳{price.toFixed(2)}</span>;
      },
    },
    {
      title: "Stock",
      key: "stock",
      render: (_value, record) => {
        // 🟡 If product has variants → show message
        if ("variants" in record && record.variants?.length) {
          return (
            <span className="italic text-gray-400">
              Stock managed in variants
            </span>
          );
        }

        // 🟢 Otherwise editable stock
        const key = record.id;
        const editedValue = editedStocks[key] ?? record.stock;
        const showUpdateButton = key in editedStocks && !bulkActive;

        // Determine correct parent + variant IDs
        const parentId =
          "variants" in record ? record.id : (record as VariantRow).productId;
        const variantId =
          "variants" in record ? null : (record as VariantRow).id;

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
              className="!w-20 text-center font-bold [&>input]:text-center [&>input]:font-bold"
            />
            {showUpdateButton && (
              <SheiButton
                onClick={async (e) => {
                  e.stopPropagation();
                  await onSingleUpdate(parentId, variantId, editedValue);
                }}
                size="small"
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
      expandable={{
        expandedRowRender: (record) =>
          "variants" in record && record.variants?.length ? (
            <DataTable
              columns={columns}
              data={record.variants.map((v) => ({
                ...v,
                productId: record.id, // ✅ ensures variants know their parent
              }))}
              rowKey="id"
              pagination={false}
            />
          ) : null,
        rowExpandable: (record) =>
          "variants" in record && !!record.variants?.length,
      }}
    />
  );
};

export default StockTable;
