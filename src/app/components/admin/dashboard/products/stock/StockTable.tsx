"use client";

import React from "react";
import type { ColumnsType } from "antd/es/table";
import type { TableRowSelection } from "antd/es/table/interface";
import DataTable from "@/app/components/admin/common/DataTable";
import Image from "next/image";
import { InputNumber } from "antd";

interface Product {
  id: string;
  title: string;
  currentPrice: number;
  stock: number;
  imageUrl: string | null;
}

interface StockTableProps {
  products: Product[];
  editedStocks: Record<string, number>;
  onStockChange: (id: string, value: number) => void;
  rowSelection?: TableRowSelection<Product>;
  loading?: boolean;
}

const StockTable: React.FC<StockTableProps> = ({
  products,
  editedStocks,
  onStockChange,
  rowSelection,
  loading,
}) => {
  const columns: ColumnsType<Product> = [
    {
      title: "Image",
      key: "image",
      align: "center",
      width: 100,
      render: (_value: unknown, record: Product) =>
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
      title: "Product Name",
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
      render: (_value: number, record: Product) => (
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
    />
  );
};

export default StockTable;
