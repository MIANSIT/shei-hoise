"use client";

import React from "react";
import { Popconfirm, Tooltip } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { Category } from "@/lib/types/category";
import DataTable from "@/app/components/admin/common/DataTable";

interface CategoryTableProps {
  data: Category[];
  loading?: boolean;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onToggleActive: (category: Category, isActive: boolean) => void;
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      aria-checked={checked}
      role="switch"
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full
                  transition-colors duration-300 focus:outline-none focus:ring-2
                  focus:ring-offset-1 focus:ring-indigo-500/40
                  ${checked ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow
                    transition-transform duration-300
                    ${checked ? "translate-x-4" : "translate-x-0.5"}`}
      />
    </button>
  );
}

const ColHeader = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 whitespace-nowrap">
    {children}
  </span>
);

export default function CategoryTable({
  data,
  loading = false,
  onEdit,
  onDelete,
  onToggleActive,
}: CategoryTableProps) {
  const columns: ColumnsType<Category> = [
    {
      title: <ColHeader>Name</ColHeader>,
      dataIndex: "name",
      key: "name",
      width: 200,
      render: (name: string, record: Category) => (
        <div className="min-w-35">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-tight">
            {name}
          </p>
          {record.description && (
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1 max-w-50">
              {record.description}
            </p>
          )}
        </div>
      ),
    },
    {
      title: <ColHeader>Slug</ColHeader>,
      dataIndex: "slug",
      key: "slug",
      width: 160,
      responsive: ["md"] as never, // hide on small screens
      render: (slug: string) => (
        <span
          className="inline-block font-mono text-[11px] px-2 py-0.5 rounded-md
                         bg-gray-100 dark:bg-[#0f1117]
                         text-gray-500 dark:text-gray-400
                         border border-gray-200 dark:border-[#2a2d3a]
                         whitespace-nowrap max-w-35 truncate"
        >
          {slug}
        </span>
      ),
    },
    {
      title: <ColHeader>Created</ColHeader>,
      dataIndex: "createdAt",
      key: "createdAt",
      width: 110,
      responsive: ["lg"] as never, // hide on mobile & tablet
      render: (date: string) => (
        <span className="text-xs text-gray-400 tabular-nums whitespace-nowrap">
          {date}
        </span>
      ),
    },
    {
      title: <ColHeader>Status</ColHeader>,
      dataIndex: "is_active",
      key: "is_active",
      width: 110,
      render: (_: unknown, record: Category) => (
        <div className="flex items-center gap-2">
          <ToggleSwitch
            checked={record.is_active}
            onChange={(checked) => onToggleActive(record, checked)}
          />
          <span
            className={`text-xs font-medium hidden sm:inline
                            ${record.is_active ? "text-emerald-500" : "text-gray-400 dark:text-gray-500"}`}
          >
            {record.is_active ? "Active" : "Inactive"}
          </span>
        </div>
      ),
    },
    {
      title: (
        <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 block text-right">
          Actions
        </span>
      ),
      key: "actions",
      width: 90,
      fixed: "right" as const,
      render: (_: unknown, record: Category) => (
        <div className="flex gap-1.5 justify-end">
          <Tooltip title="Edit">
            <button
              onClick={() => onEdit(record)}
              className="w-7 h-7 flex items-center justify-center rounded-lg
                         border border-gray-200 dark:border-[#2a2d3a]
                         text-gray-400 hover:text-indigo-500
                         hover:border-indigo-300 dark:hover:border-indigo-600
                         hover:bg-indigo-50 dark:hover:bg-indigo-500/10
                         transition-all duration-150"
            >
              <EditOutlined style={{ fontSize: 12 }} />
            </button>
          </Tooltip>

          <Popconfirm
            title={
              <span className="text-sm font-medium">Delete this category?</span>
            }
            description={
              <span className="text-xs text-gray-400">
                This cannot be undone.
              </span>
            }
            onConfirm={() => onDelete(record)}
            okText="Delete"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
            placement="topRight"
          >
            <Tooltip title="Delete">
              <button
                className="w-7 h-7 flex items-center justify-center rounded-lg
                                 border border-red-200 dark:border-red-500/20
                                 text-red-400 hover:text-red-500
                                 hover:bg-red-50 dark:hover:bg-red-500/10
                                 transition-all duration-150"
              >
                <DeleteOutlined style={{ fontSize: 12 }} />
              </button>
            </Tooltip>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    /*
      overflow-x-auto  → scrollable on narrow viewports (tablets in portrait, etc.)
      The `fixed: "right"` on Actions column pins it during horizontal scroll.
    */
    <div
      className="rounded-2xl overflow-hidden border border-gray-200 dark:border-[#2a2d3a]
                    bg-white dark:bg-[#16181f] overflow-x-auto"
    >
      <DataTable<Category>
        columns={columns}
        data={data}
        loading={loading}
        pagination={false}
        scroll={{ x: "max-content" }}
        rowClassName="hover:bg-gray-50 dark:hover:bg-[#1c1f2b] transition-colors duration-150"
        className="
          [&_.ant-table]:bg-transparent
          [&_.ant-table-thead_>_tr_>_th]:bg-gray-50
          [&_.ant-table-thead_>_tr_>_th]:dark:bg-[#13151d]
          [&_.ant-table-thead_>_tr_>_th]:border-b
          [&_.ant-table-thead_>_tr_>_th]:border-gray-200
          [&_.ant-table-thead_>_tr_>_th]:dark:border-[#2a2d3a]
          [&_.ant-table-tbody_>_tr_>_td]:border-b
          [&_.ant-table-tbody_>_tr_>_td]:border-gray-100
          [&_.ant-table-tbody_>_tr_>_td]:dark:border-[#2a2d3a]/60
          [&_.ant-table-tbody_>_tr:last-child_>_td]:border-0
          [&_.ant-table-cell-fix-right]:bg-white
          [&_.ant-table-cell-fix-right]:dark:bg-[#16181f]
        "
      />
    </div>
  );
}
