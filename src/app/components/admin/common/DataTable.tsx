"use client";

import React from "react";
import { Table } from "antd";
import type { TableProps } from "antd";
import type { ColumnsType } from "antd/es/table";

interface DataTableProps<T> {
  columns: ColumnsType<T>;
  data: T[];
  loading?: boolean;
  rowKey?: keyof T | ((record: T) => string); // ✅ change here
  pagination?: TableProps<T>["pagination"];
  bordered?: boolean;
  rowSelection?: TableProps<T>["rowSelection"];
}

function DataTable<T extends object>({
  columns,
  data,
  loading = false,
  rowKey = "id" as keyof T,
  pagination = { pageSize: 10 },
  bordered = true,
  rowSelection, // ✅ add here
}: DataTableProps<T>) {
  // Convert rowKey to function if string
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
      rowSelection={rowSelection} // ✅ pass it to Table
      className="custom-table"
    />
  );
}

export default DataTable;
