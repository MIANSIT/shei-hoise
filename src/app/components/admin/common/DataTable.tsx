// File: components/admin/common/DataTable.tsx
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
  expandable?: TableProps<T>["expandable"];
  rowClassName?: TableProps<T>["rowClassName"];
}

function DataTable<T extends object>({
  columns,
  data,
  loading = false,
  rowKey = "id" as keyof T,
  pagination = { pageSize: 10 },
  bordered = true,
  rowSelection,
  size = "middle",
  expandable,
  rowClassName,
}: DataTableProps<T>) {
  const getRowKey =
    typeof rowKey === "function" ? rowKey : (record: T) => `${record[rowKey]}`;

  return (
    <div className="w-full overflow-x-auto">
      <Table<T>
        columns={columns}
        dataSource={data}
        rowKey={getRowKey}
        loading={loading}
        pagination={pagination}
        bordered={bordered}
        rowSelection={rowSelection}
        size={size}
        expandable={expandable}
        rowClassName={rowClassName}
      />
    </div>
  );
}

export default DataTable;
