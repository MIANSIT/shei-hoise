"use client";

import React from "react";
import { Button, Popconfirm, Switch, Tooltip } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import DataTable from "@/app/components/admin/common/DataTable";
import type { ColumnsType } from "antd/es/table";
import type { Category } from "@/lib/types/category";

interface CategoryTableProps {
  data: Category[];
  loading?: boolean;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onToggleActive: (category: Category, isActive: boolean) => void; // ✅ add this
}

export default function CategoryTable({
  data,
  loading = false,
  onEdit,
  onDelete,
  onToggleActive, // ✅ destructure the new prop
}: CategoryTableProps) {
  const columns: ColumnsType<Category> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
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
    },
    {
      title: "Active",
      dataIndex: "is_active",
      key: "is_active",
      render: (_, record) => (
        <Switch
          checked={record.is_active}
          onChange={(checked) => onToggleActive(record, checked)}
          checkedChildren="Active"
          unCheckedChildren="Inactive"
          style={{
            backgroundColor: record.is_active ? "#22c55e" : "#ef4444", // Tailwind green-500 / red-500
          }}
        />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <div className="flex flex-wrap gap-2">
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit(record)}
            />
          </Tooltip>

          <Popconfirm
            title="Are you sure to delete this category?"
            onConfirm={() => onDelete(record)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <DataTable<Category> columns={columns} data={data} loading={loading} />
  );
}
