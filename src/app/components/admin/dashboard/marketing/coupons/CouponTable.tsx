"use client";

import { memo, useCallback, useState } from "react";
import { Table, Dropdown, Button, Spin, App, Tag } from "antd";
import { EditOutlined, DeleteOutlined, MoreOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { Tag as TagIcon } from "lucide-react";
import type { ColumnsType } from "antd/es/table";
import type { MenuProps } from "antd";
import dayjs from "dayjs";
import { CouponDiscountType } from "@/lib/types/enums";
import type { Coupon } from "@/lib/types/coupon";

interface CouponTableProps {
  data: Coupon[];
  loading: boolean;
  deletingId: string | null;
  currencySymbol: string;
  onEdit: (coupon: Coupon) => void;
  onDelete: (coupon: Coupon) => void;
}

const TABLE_STYLES = `
  .coupon-table .ant-table-thead > tr > th {
    background: #fafafa !important; color: #6b7280 !important;
    font-size: 11px !important; font-weight: 700 !important;
    text-transform: uppercase !important; letter-spacing: 0.06em !important;
    border-bottom: 1px solid #f0f0f5 !important; padding: 12px 16px !important;
  }
  .dark .coupon-table .ant-table-thead > tr > th {
    background: #1f2937 !important; color: #9ca3af !important;
    border-bottom-color: #374151 !important;
  }
  .coupon-table .ant-table-tbody > tr > td {
    padding: 14px 16px !important; border-bottom: 1px solid #f9fafb !important;
  }
  .dark .coupon-table .ant-table-tbody > tr > td { border-bottom-color: #374151 !important; }
  .coupon-table .ant-table-tbody > tr:last-child > td { border-bottom: none !important; }
`;

const EmptyCoupons = () => (
  <div className="py-16 flex flex-col items-center gap-3">
    <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-emerald-50 to-teal-100 dark:from-emerald-950 dark:to-teal-900 flex items-center justify-center">
      <TagIcon size={28} color="#6ee7b7" strokeWidth={1.5} />
    </div>
    <p className="font-semibold text-gray-700 dark:text-gray-300 m-0">No coupons yet</p>
    <p className="text-sm text-gray-400 dark:text-gray-500 m-0">Create a coupon to run your first sale</p>
  </div>
);

function CouponTable({ data, loading, deletingId, currencySymbol, onEdit, onDelete }: CouponTableProps) {
  const { modal } = App.useApp();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const confirmDelete = useCallback(
    (record: Coupon) => {
      modal.confirm({
        title: "Delete this coupon?",
        icon: <ExclamationCircleOutlined />,
        content:
          "This cannot be undone. A coupon that's already been redeemed can't be deleted — deactivate it instead.",
        okText: "Delete",
        cancelText: "Cancel",
        okButtonProps: { danger: true },
        onOk: () => onDelete(record),
      });
    },
    [modal, onDelete],
  );

  const getRowMenuItems = useCallback(
    (record: Coupon): MenuProps["items"] => [
      {
        key: "edit",
        icon: <EditOutlined style={{ color: "#10b981" }} />,
        label: <span className="text-gray-700 dark:text-gray-300 text-sm">Edit</span>,
        onClick: ({ domEvent }) => {
          domEvent.stopPropagation();
          setOpenMenuId(null);
          onEdit(record);
        },
      },
      { type: "divider" },
      {
        key: "delete",
        danger: true,
        icon: deletingId === record.id ? <Spin size="small" /> : <DeleteOutlined />,
        label: <span className="text-sm">Delete</span>,
        onClick: ({ domEvent }) => {
          domEvent.stopPropagation();
          setOpenMenuId(null);
          confirmDelete(record);
        },
      },
    ],
    [deletingId, onEdit, confirmDelete],
  );

  const columns: ColumnsType<Coupon> = [
    {
      title: "Code",
      dataIndex: "code",
      key: "code",
      render: (code: string) => (
        <span className="font-mono font-semibold text-gray-800 dark:text-gray-100">{code}</span>
      ),
    },
    {
      title: "Discount",
      key: "discount",
      render: (_, record) => (
        <span className="text-gray-700 dark:text-gray-300">
          {record.discount_type === CouponDiscountType.PERCENTAGE
            ? `${record.discount_value}%`
            : `${currencySymbol ? `${currencySymbol} ` : ""}${record.discount_value}`}
          {record.max_discount_amount != null && (
            <span className="text-xs text-gray-400"> (cap {currencySymbol} {record.max_discount_amount})</span>
          )}
        </span>
      ),
    },
    {
      title: "Min Order",
      key: "min_order",
      responsive: ["md"],
      render: (_, record) =>
        record.min_order_amount != null ? (
          <span className="text-gray-500 dark:text-gray-400">
            {currencySymbol} {record.min_order_amount}
          </span>
        ) : (
          <span className="text-gray-400 dark:text-gray-500">—</span>
        ),
    },
    {
      title: "Usage",
      key: "usage",
      responsive: ["md"],
      render: (_, record) => (
        <span className="text-gray-700 dark:text-gray-300">
          {record.current_uses} / {record.max_uses ?? "∞"}
          {record.max_uses_per_customer != null && (
            <span className="block text-xs text-gray-400">
              max {record.max_uses_per_customer} per customer
            </span>
          )}
        </span>
      ),
    },
    {
      title: "Window",
      key: "window",
      responsive: ["lg"],
      render: (_, record) => {
        if (!record.starts_at && !record.ends_at) {
          return <span className="text-gray-400 dark:text-gray-500">Always</span>;
        }
        const fmt = (d: string | null) => (d ? dayjs(d).format("MMM D, YYYY h:mm A") : "—");
        return (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {fmt(record.starts_at)} → {fmt(record.ends_at)}
          </span>
        );
      },
    },
    {
      title: "Status",
      key: "status",
      width: 100,
      render: (_, record) => (
        <Tag color={record.is_active ? "green" : "default"} className="rounded-full">
          {record.is_active ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 48,
      render: (_, record) => (
        <Dropdown
          menu={{ items: getRowMenuItems(record) }}
          trigger={["click"]}
          placement="bottomRight"
          open={openMenuId === record.id}
          onOpenChange={(next) => setOpenMenuId(next ? record.id : null)}
        >
          <Button
            type="text"
            icon={<MoreOutlined />}
            size="small"
            onClick={(e) => e.stopPropagation()}
            className="text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300"
          />
        </Dropdown>
      ),
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden overflow-x-auto">
      <style>{TABLE_STYLES}</style>
      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey="id"
        className="coupon-table"
        locale={{ emptyText: <EmptyCoupons /> }}
        pagination={false}
        scroll={{ x: 900 }}
      />
    </div>
  );
}

export default memo(CouponTable);
