"use client";

import React from "react";
import type { ColumnsType } from "antd/es/table";
import type { TableRowSelection } from "antd/es/table/interface";
import DataTable from "@/app/components/admin/common/DataTable";
import Image from "next/image";
import { InputNumber } from "antd";
import {
  ProductRow,
  VariantRow,
} from "@/lib/hook/products/stock/mapProductsForTable";

interface StockTableProps {
  products: ProductRow[];
  onStockChange: (
    productId: string,
    variantId: string | null,
    value: number
  ) => void;
  rowSelection?: TableRowSelection<ProductRow>;
  loading?: boolean;
}

const StockTable: React.FC<StockTableProps> = ({
  products,
  onStockChange,
  rowSelection,
  loading,
}) => {
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
      dataIndex: "stock",
      key: "stock",
      render: (_value, record) => {
        if ("variants" in record && record.variants?.length) {
          return (
            <span className="italic text-gray-400">
              Stock managed in variants
            </span>
          );
        }

        const variantId =
          "variants" in record ? null : (record as VariantRow).id;
        return (
          <InputNumber
            min={0}
            value={record.stock}
            onChange={(value) =>
              onStockChange(record.id, variantId, Number(value ?? 0))
            }
            className="!w-20 text-center font-bold [&>input]:text-center [&>input]:font-bold"
          />
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
