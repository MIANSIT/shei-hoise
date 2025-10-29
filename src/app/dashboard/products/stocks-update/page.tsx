"use client"

import React from "react"
import StockChangeTable from "@/app/components/admin/dashboard/products/stock/StockChangeTable"

const StockPage = () => {
  return (
    <div className="">
      <h1 className="text-2xl font-bold mb-4">Manage Product Stock</h1>
      <StockChangeTable />
    </div>
  )
}

export default StockPage
