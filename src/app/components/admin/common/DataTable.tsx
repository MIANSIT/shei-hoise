// components/common/DataTable.tsx
"use client"

import React from "react"
import { Table } from "antd"
import type { TableProps } from "antd"
import type { ColumnsType } from "antd/es/table"

interface DataTableProps<T> {
  columns: ColumnsType<T>
  data: T[]
  loading?: boolean
  rowKey?: string | ((record: T) => string)
  pagination?: TableProps<T>["pagination"]
  bordered?: boolean
}

function DataTable<T extends object>({
  columns,
  data,
  loading = false,
  rowKey = "id",
  pagination = { pageSize: 10 },
  bordered = true,
}: DataTableProps<T>) {
  return (
    <Table<T>
      columns={columns}
      dataSource={data}
      rowKey={rowKey}
      loading={loading}
      pagination={pagination}
      bordered={bordered}
      className="custom-table"
    />
  )
}

export default DataTable
