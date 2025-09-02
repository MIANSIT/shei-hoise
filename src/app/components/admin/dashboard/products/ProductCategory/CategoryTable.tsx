// File: components/admin/products/CategoryTable.tsx
"use client";

import React from "react";
import { Button, Popconfirm, message } from "antd";
import DataTable from "@/app/components/admin/common/DataTable";
import type { ColumnsType } from "antd/es/table";
import type { Category } from "@/lib/types/category";

interface CategoryTableProps {
  data: Category[];
  loading?: boolean;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

export default function CategoryTable({
  data,
  loading = false,
  onEdit,
  onDelete,
}: CategoryTableProps) {
  const columns: ColumnsType<Category> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 100,
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: 200,
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
    },
    {
      title: "Actions",
      key: "actions",
      width: 180,
      render: (_, record) => (
        <div className="flex gap-2">
          <Button type="default" size="small" onClick={() => onEdit(record)}>
            Edit
          </Button>
          <Popconfirm
            title="Are you sure to delete this category?"
            onConfirm={() => {
              onDelete(record);
              message.success("Category deleted");
            }}
            okText="Yes"
            cancelText="No"
          >
            <Button type="primary" danger size="small">
              Delete
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return <DataTable<Category> columns={columns} data={data} loading={loading} />;
}
