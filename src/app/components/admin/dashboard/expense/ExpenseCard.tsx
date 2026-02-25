"use client";

import { Tooltip, Dropdown, Button, Popconfirm, Spin } from "antd";
import { EditOutlined, DeleteOutlined, MoreOutlined } from "@ant-design/icons";
import { Receipt, Store, FileText, Calendar } from "lucide-react";
import dayjs from "dayjs";
import type { Expense } from "@/lib/types/expense/type";
import DynamicLucideIcon from "./DynamicLucideIcon";
import { getCategoryColor, hexToRgba } from "@/lib/types/expense/expense-utils";
import { AmountCell, CategoryCell, PaymentCell, PlatformCell } from "./ExpenseTableCells";

interface ExpenseCardProps {
  record: Expense;
  deletingId: string | null;
  onEdit: (e: Expense) => void;
  onDelete: (id: string) => void;
  currencyIcon: React.ReactNode;
}

export function ExpenseCard({
  record,
  deletingId,
  onEdit,
  onDelete,
  currencyIcon,
}: ExpenseCardProps) {
  const color = record.category ? getCategoryColor(record.category) : "#9ca3af";

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm transition-shadow hover:shadow-md">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
            style={{ background: hexToRgba(color, 0.12) }}
          >
            {record.category?.icon ? (
              <DynamicLucideIcon name={record.category.icon} size={18} color={color} />
            ) : (
              <Receipt size={18} color="#9ca3af" strokeWidth={2} />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white text-sm leading-tight truncate">
              {record.title}
            </p>
            {record.vendor_name && (
              <div className="flex items-center gap-1 mt-0.5">
                <Store size={10} className="text-gray-400" strokeWidth={2} />
                <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
                  {record.vendor_name}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <AmountCell amount={Number(record.amount)} currencyIcon={currencyIcon} />
          <Dropdown
            menu={{
              items: [
                {
                  key: "edit",
                  icon: <EditOutlined style={{ color: "#6366f1" }} />,
                  label: "Edit",
                  onClick: () => onEdit(record),
                },
                { type: "divider" },
                {
                  key: "delete",
                  danger: true,
                  icon: deletingId === record.id ? <Spin size="small" /> : <DeleteOutlined />,
                  label: (
                    <Popconfirm
                      title="Delete expense?"
                      description="This action cannot be undone."
                      onConfirm={() => onDelete(record.id)}
                      okText="Delete"
                      cancelText="Cancel"
                      okButtonProps={{ danger: true }}
                    >
                      <span>Delete</span>
                    </Popconfirm>
                  ),
                },
              ],
            }}
            trigger={["click"]}
            placement="bottomRight"
          >
            <Button type="text" icon={<MoreOutlined />} size="small" className="text-gray-400 rounded-lg" />
          </Dropdown>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2 mt-3 min-w-0">
        {record.category && <CategoryCell record={record} />}
        {record.payment_method && <PaymentCell method={record.payment_method} />}
        {record.platform && <PlatformCell platform={record.platform} />}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 dark:border-gray-700">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
          <Calendar size={11} strokeWidth={2} />
          <span>{dayjs(record.expense_date).format("MMM D, YYYY")}</span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span>{dayjs(record.expense_date).fromNow()}</span>
        </div>
        {record.notes && (
          <Tooltip title={record.notes} placement="topLeft">
            <div className="flex items-center gap-1 cursor-pointer">
              <FileText size={11} className="text-indigo-300" strokeWidth={2} />
              <span className="text-xs text-gray-400 dark:text-gray-500 max-w-20 truncate">
                {record.notes}
              </span>
            </div>
          </Tooltip>
        )}
      </div>
    </div>
  );
}