// components/stock/StockChangeTable.tsx
"use client"

import React, { useState } from "react"
import type { ColumnsType } from "antd/es/table"
import DataTable from "@/app/components/admin/common/DataTable"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { dummyProducts } from "@/lib/store/dummyProducts" // adjust path
import { Button } from "@/components/ui/button"

interface Product {
  id: number
  title: string
  currentPrice: string
  stock: number
  images: string[]
}

const StockChangeTable = () => {
  const [products, setProducts] = useState<Product[]>(dummyProducts)
  const [editedStocks, setEditedStocks] = useState<Record<number, number>>({})

  const handleStockChange = (id: number, value: number) => {
    setEditedStocks((prev) => ({
      ...prev,
      [id]: value,
    }))
  }

  const handleUpdateStock = async () => {
    // create payload for API call
    const updates = Object.entries(editedStocks).map(([id, stock]) => ({
      id: Number(id),
      stock,
    }))

    // Simulate API call
    console.log("Updating stock for products:", updates)

    // In future: replace with API call
    // await fetch("/api/products/update-stock", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(updates),
    // })

    // Update local state after "success"
    setProducts((prev) =>
      prev.map((p) =>
        editedStocks[p.id] !== undefined
          ? { ...p, stock: editedStocks[p.id] }
          : p
      )
    )

    // Clear pending edits
    setEditedStocks({})
  }

  const columns: ColumnsType<Product> = [
    {
      title: "Image",
      dataIndex: "images",
      key: "images",
      render: (images) => (
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
      render: (_, record) => (
        <Input
          type="number"
          value={
            editedStocks[record.id] !== undefined
              ? editedStocks[record.id]
              : record.stock
          }
          onChange={(e) => handleStockChange(record.id, Number(e.target.value))}
          className="w-24"
        />
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {/* Update Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleUpdateStock}
          disabled={Object.keys(editedStocks).length === 0}
        >
          Update Stock
        </Button>
      </div>

      {/* Table */}
      <DataTable columns={columns} data={products} pagination={false} />
    </div>
  )
}

export default StockChangeTable
