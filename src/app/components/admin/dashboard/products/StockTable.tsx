"use client"

import React from "react"
import type { ColumnsType } from "antd/es/table"
import type { TableRowSelection } from "antd/es/table/interface"
import DataTable from "@/app/components/admin/common/DataTable"
import Image from "next/image"
import { InputNumber } from "antd"

interface Product {
  id: number
  title: string
  currentPrice: string
  stock: number
  images: string[]
}

interface StockTableProps {
  products: Product[]
  editedStocks: Record<number, number>
  onStockChange: (id: number, value: number) => void
  rowSelection?: TableRowSelection<Product>
}

const StockTable: React.FC<StockTableProps> = ({
  products,
  editedStocks,
  onStockChange,
  rowSelection,
}) => {
  const columns: ColumnsType<Product> = [
    {
      title: "Image",
      dataIndex: "images",
      key: "images",
      render: (images: string[]) => (
        <Image
          src={images[0]}
          alt="product"
          width={50}
          height={50}
          className="rounded-md object-cover"
        />
      ),
    },
    {
      title: "Product Name",
      dataIndex: "title",
      key: "title",
    },
    {
      title: "Price",
      dataIndex: "currentPrice",
      key: "currentPrice",
      render: (price) => <span>${price}</span>,
    },
    {
      title: "Stock",
      dataIndex: "stock",
      key: "stock",
      render: (_: number, record: Product) => (
        <InputNumber
          min={0}
          value={editedStocks[record.id] ?? record.stock}
          onChange={(value) => onStockChange(record.id, Number(value ?? 0))}
          className="!w-20 text-center font-bold [&>input]:text-center [&>input]:font-bold"
        />
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={products}
      rowKey="id"
      rowSelection={rowSelection}
      pagination={false}
    />
  )
}

export default StockTable
