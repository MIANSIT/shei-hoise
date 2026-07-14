"use client";

import { memo, useCallback, useState } from "react";
import { Table, Dropdown, Button, Spin, App, Tag } from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { Users, AlertTriangle } from "lucide-react";
import type { ColumnsType } from "antd/es/table";
import type { MenuProps } from "antd";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import type { Vendor, VendorListSummary } from "@/lib/types/vendor/type";

// A vendor is worth chasing when money is owed and either nothing has ever
// been collected, or it's been over two weeks since the last payment — a
// reasonable default cadence for a weekly/monthly settlement business.
const OVERDUE_DAYS_THRESHOLD = 14;

interface VendorTableProps {
  data: Vendor[];
  loading: boolean;
  deletingId: string | null;
  summaries: Map<string, VendorListSummary>;
  currencySymbol: string;
  onEdit: (vendor: Vendor) => void;
  onDelete: (id: string) => void;
}

const TABLE_STYLES = `
  .vendor-table .ant-table-thead > tr > th {
    background: #fafafa !important; color: #6b7280 !important;
    font-size: 11px !important; font-weight: 700 !important;
    text-transform: uppercase !important; letter-spacing: 0.06em !important;
    border-bottom: 1px solid #f0f0f5 !important; padding: 12px 16px !important;
  }
  .dark .vendor-table .ant-table-thead > tr > th {
    background: #1f2937 !important; color: #9ca3af !important;
    border-bottom-color: #374151 !important;
  }
  .vendor-table .ant-table-tbody > tr > td {
    padding: 14px 16px !important; border-bottom: 1px solid #f9fafb !important;
  }
  .dark .vendor-table .ant-table-tbody > tr > td { border-bottom-color: #374151 !important; }
  .vendor-table .ant-table-tbody > tr:hover > td { background: #fafbff !important; }
  .dark .vendor-table .ant-table-tbody > tr:hover > td { background: #1e293b !important; }
  .vendor-table .ant-table-tbody > tr:last-child > td { border-bottom: none !important; }
`;

const EmptyVendors = () => (
  <div className="py-16 flex flex-col items-center gap-3">
    <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950 dark:to-indigo-900 flex items-center justify-center">
      <Users size={28} color="#a5b4fc" strokeWidth={1.5} />
    </div>
    <p className="font-semibold text-gray-700 dark:text-gray-300 m-0">No vendors yet</p>
    <p className="text-sm text-gray-400 dark:text-gray-500 m-0">Add your first vendor to get started</p>
  </div>
);

function VendorTable({
  data,
  loading,
  deletingId,
  summaries,
  currencySymbol,
  onEdit,
  onDelete,
}: VendorTableProps) {
  const router = useRouter();
  const { modal } = App.useApp();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const fmtMoney = useCallback(
    (v: number) => `${currencySymbol ? `${currencySymbol} ` : ""}${v.toFixed(2)}`,
    [currencySymbol],
  );

  const confirmDelete = useCallback(
    (record: Vendor) => {
      modal.confirm({
        title: "Delete this vendor?",
        icon: <ExclamationCircleOutlined />,
        content:
          "This cannot be undone. Vendors with existing orders cannot be deleted — set them to Inactive instead.",
        okText: "Delete",
        cancelText: "Cancel",
        okButtonProps: { danger: true },
        onOk: () => onDelete(record.id),
      });
    },
    [modal, onDelete],
  );

  const getRowMenuItems = useCallback(
    (record: Vendor): MenuProps["items"] => [
      {
        key: "view",
        icon: <EyeOutlined style={{ color: "#6366f1" }} />,
        label: <span className="text-gray-700 dark:text-gray-300 text-sm">View Details</span>,
        onClick: ({ domEvent }) => {
          domEvent.stopPropagation();
          setOpenMenuId(null);
          router.push(`/dashboard/vendors/${record.id}`);
        },
      },
      {
        key: "edit",
        icon: <EditOutlined style={{ color: "#6366f1" }} />,
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
    [deletingId, onEdit, confirmDelete, router],
  );

  const columns: ColumnsType<Vendor> = [
    {
      title: "Vendor",
      key: "name",
      render: (_, record) => (
        <div>
          <div className="font-semibold text-gray-800 dark:text-gray-100">{record.name}</div>
          {record.business_name && (
            <div className="text-xs text-gray-400 dark:text-gray-500">{record.business_name}</div>
          )}
        </div>
      ),
    },
    { title: "Phone", dataIndex: "phone", key: "phone", width: 160 },
    {
      title: "Address",
      dataIndex: "address",
      key: "address",
      responsive: ["lg"],
      render: (address: string | null) => (
        <span className="text-gray-500 dark:text-gray-400">{address || "—"}</span>
      ),
    },
    {
      title: "Stock Held",
      key: "stock",
      width: 150,
      responsive: ["md"],
      render: (_, record) => {
        const s = summaries.get(record.id);
        if (!s || s.stock_quantity === 0) {
          return <span className="text-gray-400 dark:text-gray-500">—</span>;
        }
        return (
          <div>
            <div className="font-medium text-gray-800 dark:text-gray-100">{s.stock_quantity} units</div>
            <div className="text-xs text-gray-400">{fmtMoney(s.stock_value)}</div>
          </div>
        );
      },
    },
    {
      title: "Current Due",
      key: "due",
      width: 160,
      render: (_, record) => {
        const s = summaries.get(record.id);
        const due = s?.current_due ?? 0;
        const daysSince = s?.last_payment_date
          ? dayjs().diff(dayjs(s.last_payment_date), "day")
          : null;
        const needsCollection = due > 0 && (daysSince === null || daysSince > OVERDUE_DAYS_THRESHOLD);
        const overLimit = record.credit_limit > 0 && due > record.credit_limit;
        return (
          <div>
            <div className={due > 0 ? "font-semibold text-red-500" : "font-medium text-gray-800 dark:text-gray-100"}>
              {fmtMoney(due)}
              {record.credit_limit > 0 && (
                <span className="text-xs text-gray-400 font-normal"> / {fmtMoney(record.credit_limit)}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {needsCollection && (
                <Tag color="red" icon={<AlertTriangle size={11} />} className="rounded-full">
                  Needs Collection
                </Tag>
              )}
              {overLimit && (
                <Tag color="volcano" className="rounded-full">
                  Over Limit
                </Tag>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (status: string) => (
        <Tag color={status === "active" ? "green" : "default"} className="rounded-full">
          {status === "active" ? "Active" : "Inactive"}
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
        className="vendor-table"
        locale={{ emptyText: <EmptyVendors /> }}
        pagination={false}
        onRow={(record) => ({
          onClick: () => router.push(`/dashboard/vendors/${record.id}`),
          className: "cursor-pointer",
        })}
        scroll={{ x: 980 }}
      />
    </div>
  );
}

export default memo(VendorTable);
