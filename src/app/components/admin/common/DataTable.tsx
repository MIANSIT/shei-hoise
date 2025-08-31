"use client";

import React from "react";
import { Table } from "antd";
import type { TableProps } from "antd";
import type { ColumnsType } from "antd/es/table";

interface DataTableProps<T extends object> {
  columns: ColumnsType<T>;
  data: T[];
  loading?: boolean;
  rowKey?: keyof T | ((record: T) => string);
  pagination?: TableProps<T>["pagination"];
}

function DataTable<T extends object>({
  columns,
  data,
  loading = false,
  rowKey = "id" as keyof T,
  pagination = { pageSize: 10 },
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
      bordered={false}
      className="custom-ant-table"
      rowClassName={() => "custom-ant-row"}
      components={{
        header: {
          cell: (props) => (
            <th
              {...props}
              style={{
                ...props.style,
                fontWeight: 600,
                backgroundColor: "#fafafa",
                textAlign: "center",
              }}
            />
          ),
        },
        body: {
          cell: (props) => (
            <td
              {...props}
              style={{
                ...props.style,
                textAlign: "center", // horizontal center
                verticalAlign: "middle", // vertical center
              }}
            />
          ),
        },
      }}
    />
  );
}

export default DataTable;
