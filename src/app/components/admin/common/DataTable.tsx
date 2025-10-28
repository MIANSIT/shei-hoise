// File: components/admin/common/DataTable.tsx
"use client";

import React from "react";
import { Table, Grid } from "antd";
import type { TableProps } from "antd";
import type { ColumnsType } from "antd/es/table";

const { useBreakpoint } = Grid;

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
  scroll?: TableProps<T>["scroll"];
  renderCard?: (record: T) => React.ReactNode;
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
  scroll,
  renderCard,
}: DataTableProps<T>) {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const getRowKey =
    typeof rowKey === "function" ? rowKey : (record: T) => `${record[rowKey]}`;

  // Mobile card view
  if (isMobile && renderCard) {
    return (
      <div className="w-full space-y-4">
        {data.map((record, index) => (
          <div key={getRowKey(record)} className="bg-white rounded-lg border shadow-sm">
            {renderCard(record)}
          </div>
        ))}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        )}
      </div>
    );
  }

  // Desktop table view
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
        scroll={scroll}
      />
    </div>
  );
}

export default DataTable;