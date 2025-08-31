"use client";

import React from "react";
import { Table } from "antd";
import type { TableProps } from "antd";
import type { ColumnsType } from "antd/es/table";

interface DataTableProps<T> {
  columns: ColumnsType<T>;
  data: T[];
  loading?: boolean;
  rowKey?: keyof T | ((record: T) => string);
  pagination?: TableProps<T>["pagination"];
  bordered?: boolean;
  rowSelection?: TableProps<T>["rowSelection"];
  size?: "small" | "middle" | "large";
  // ✅ optional modern styles without custom CSS
}

function DataTable<T extends object>({
  columns,
  data,
  loading = false,
  rowKey = "id" as keyof T,
  pagination = { pageSize: 10 },
  bordered = true,
  rowSelection,
  size = "middle", // modern default
}: DataTableProps<T>) {
  const getRowKey =
    typeof rowKey === "function" ? rowKey : (record: T) => `${record[rowKey]}`;

  return (
    <Table<T>
      columns={columns}
      dataSource={data}
      rowKey={getRowKey}
      loading={loading}
      pagination={pagination}
      bordered={bordered}
      rowSelection={rowSelection}
      size={size}
      // ✅ AntD modern props
      style={{ borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
      tableLayout="fixed" // optional: makes columns uniform
    />
  );
}

export default DataTable;
