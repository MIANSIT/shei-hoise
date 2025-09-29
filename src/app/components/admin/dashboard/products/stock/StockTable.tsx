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
  editedStocks: Record<string, number>;
  onStockChange: (id: string, value: number) => void;
  rowSelection?: TableRowSelection<ProductRow>;
  loading?: boolean;
}

const StockTable: React.FC<StockTableProps> = ({
  products,
  editedStocks,
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
      render: (_value: number, record: ProductRow | VariantRow) => (
        <InputNumber
          min={0}
          value={editedStocks[record.id] ?? record.stock}
          onChange={(value) => onStockChange(record.id, Number(value ?? 0))}
          className="!w-20 text-center font-bold [&>input]:text-center [&>input]:font-bold"
        />
      ),
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
        expandedRowRender: (record) => {
          // Only expand if this row is a ProductRow and has variants
          if (
            "variants" in record &&
            record.variants &&
            record.variants.length > 0
          ) {
            return (
              <DataTable
                columns={columns}
                data={record.variants}
                rowKey="id"
                pagination={false}
                // Nested rows should not have row selection
                rowSelection={undefined}
              />
            );
          }
          return null;
        },
        rowExpandable: (record) =>
          "variants" in record &&
          !!record.variants &&
          record.variants.length > 0,
      }}
    />
  );
};

export default StockTable;
