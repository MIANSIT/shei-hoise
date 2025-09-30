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
  const renderStockCell = (record: ProductRow | VariantRow) => {
    const key = record.id;
    const editedValue = editedStocks[key] ?? record.stock;
    const showUpdateButton = key in editedStocks && !bulkActive;

    return (
      <div className="flex items-center gap-2">
        {"variants" in record && record.variants?.length ? (
          <span className="italic text-gray-400">
            Stock managed in variants
          </span>
        ) : (
          <>
            <InputNumber
              min={0}
              value={editedValue}
              onChange={(value) =>
                onStockChange(
                  record.id,
                  "variants" in record ? null : record.id,
                  Number(value ?? 0)
                )
              }
              className="!w-20 text-center font-bold [&>input]:text-center [&>input]:font-bold"
            />
            {showUpdateButton && (
              <SheiButton
                onClick={() =>
                  onSingleUpdate(
                    record.id,
                    "variants" in record ? null : record.id,
                    editedValue
                  )
                }
                size="small"
              >
                Update
              </SheiButton>
            )}
          </>
        )}
      </div>
    );
  };

  const columns: ColumnsType<ProductRow | VariantRow> = [
    {
      title: "Image",
      key: "image",
      width: 80,
      render: (_value, record) =>
        record.imageUrl ? (
          <Image
            src={record.imageUrl}
            alt={record.title}
            width={50}
            height={50}
            className="rounded-md object-cover"
          />
        ) : (
          <div className="w-12 h-12 bg-gray-200 rounded-md" />
        ),
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
      render: (price: number) => <span>${price}</span>,
    },
    {
      title: "Stock",
      key: "stock",
      render: (_value, record) => renderStockCell(record),
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
              data={record.variants}
              rowKey="id"
              pagination={false}
              rowSelection={undefined}
            />
          ) : null,
        rowExpandable: (record) =>
          "variants" in record && !!record.variants?.length,
      }}
    />
  );
};

export default StockTable;
