"use client";

import { memo, useCallback } from "react";
import {
  Table,
  Tooltip,
  Dropdown,
  Button,
  Popconfirm,
  Spin,
//   Empty,
} from "antd";
import { EditOutlined, DeleteOutlined, MoreOutlined } from "@ant-design/icons";
import {
  Receipt,
  Store,
  CreditCard,
  FileText,
  ReceiptText,
  Calendar,
} from "lucide-react";
import type { ColumnsType } from "antd/es/table";
import type { MenuProps } from "antd";
import dayjs from "dayjs";
import type { Expense } from "@/lib/types/expense/type";
import DynamicLucideIcon from "./DynamicLucideIcon";
import { getCategoryColor, hexToRgba } from "@/lib/types/expense/expense-utils";
import {
  PAYMENT_METHOD_CONFIG,
  isPaymentMethodKey,
} from "@/lib/types/expense/expense-constants";

interface ExpenseTableProps {
  data: Expense[];
  loading: boolean;
  deletingId: string | null;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

// ─── Desktop table styles ─────────────────────────────────────────────────────

const TABLE_STYLES = `
  .expense-table .ant-table-thead > tr > th {
    background: #fafafa !important;
    color: #6b7280 !important;
    font-size: 11px !important;
    font-weight: 700 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.06em !important;
    border-bottom: 1px solid #f0f0f5 !important;
    padding: 12px 16px !important;
  }
  .dark .expense-table .ant-table-thead > tr > th {
    background: #1f2937 !important;
    color: #9ca3af !important;
    border-bottom-color: #374151 !important;
  }
  .expense-table .ant-table-tbody > tr > td {
    padding: 14px 16px !important;
    border-bottom: 1px solid #f9fafb !important;
  }
  .dark .expense-table .ant-table-tbody > tr > td {
    border-bottom-color: #374151 !important;
  }
  .expense-table .ant-table-tbody > tr:hover > td {
    background: #fafbff !important;
  }
  .dark .expense-table .ant-table-tbody > tr:hover > td {
    background: #1e293b !important;
  }
  .expense-table .ant-table-tbody > tr:last-child > td {
    border-bottom: none !important;
  }
  .expense-table .ant-table-column-sorter-up.active .anticon,
  .expense-table .ant-table-column-sorter-down.active .anticon {
    color: #6366f1 !important;
  }
`;

// ─── Mobile expense card ───────────────────────────────────────────────────────

function ExpenseCard({
  record,
  deletingId,
  onEdit,
  onDelete,
}: {
  record: Expense;
  deletingId: string | null;
  onEdit: (e: Expense) => void;
  onDelete: (id: string) => void;
}) {
  const color = record.category ? getCategoryColor(record.category) : "#9ca3af";

  return (
    <div
      className="
      bg-white dark:bg-gray-800
      border border-gray-100 dark:border-gray-700
      rounded-2xl p-4 shadow-sm
      transition-shadow hover:shadow-md
    "
    >
      {/* Top row: icon + title + amount */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Category icon */}
          <div
            className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
            style={{ background: hexToRgba(color, 0.12) }}
          >
            {record.category?.icon ? (
              <DynamicLucideIcon
                name={record.category.icon}
                size={18}
                color={color}
              />
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

        {/* Amount + actions */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-bold text-gray-900 dark:text-white text-base tabular-nums">
            $
            {Number(record.amount).toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </span>
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
                  icon:
                    deletingId === record.id ? (
                      <Spin size="small" />
                    ) : (
                      <DeleteOutlined />
                    ),
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
            <Button
              type="text"
              icon={<MoreOutlined />}
              size="small"
              className="text-gray-400 rounded-lg"
              aria-label="Row actions"
            />
          </Dropdown>
        </div>
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        {/* Category badge */}
        {record.category && (
          <div
            className="inline-flex items-center gap-1.5 rounded-lg overflow-hidden text-xs font-semibold"
            style={{
              background: hexToRgba(color, 0.08),
              border: `1px solid ${hexToRgba(color, 0.2)}`,
              paddingRight: 8,
            }}
          >
            <div className="w-1 self-stretch" style={{ background: color }} />
            <DynamicLucideIcon
              name={record.category.icon || "Tag"}
              size={11}
              color={color}
            />
            <span style={{ color }}>{record.category.name}</span>
          </div>
        )}

        {/* Payment badge */}
        {record.payment_method &&
          isPaymentMethodKey(record.payment_method) &&
          (() => {
            const cfg = PAYMENT_METHOD_CONFIG[record.payment_method];
            return (
              <div
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{ background: cfg.bg, color: cfg.color }}
              >
                <CreditCard size={10} strokeWidth={2.5} />
                {cfg.label}
              </div>
            );
          })()}

        {/* Platform badge */}
        {record.platform && (
          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-md px-2 py-0.5 font-medium">
            {record.platform}
          </span>
        )}
      </div>

      {/* Footer: date + notes */}
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

// ─── Main component ───────────────────────────────────────────────────────────

function ExpenseTable({
  data,
  loading,
  deletingId,
  onEdit,
  onDelete,
}: ExpenseTableProps) {
  const getRowMenuItems = useCallback(
    (record: Expense): MenuProps["items"] => [
      {
        key: "edit",
        icon: <EditOutlined style={{ color: "#6366f1" }} />,
        label: <span className="text-gray-700 text-sm">Edit</span>,
        onClick: () => onEdit(record),
      },
      { type: "divider" },
      {
        key: "delete",
        danger: true,
        icon:
          deletingId === record.id ? <Spin size="small" /> : <DeleteOutlined />,
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
    [deletingId, onEdit, onDelete],
  );

  const emptyState = (
    <div className="py-16 flex flex-col items-center gap-3">
      <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950 dark:to-indigo-900 flex items-center justify-center">
        <ReceiptText size={28} color="#a5b4fc" strokeWidth={1.5} />
      </div>
      <p className="font-semibold text-gray-700 dark:text-gray-300 m-0">
        No expenses found
      </p>
      <p className="text-sm text-gray-400 dark:text-gray-500 m-0">
        Try adjusting your filters or add a new expense
      </p>
    </div>
  );

  const columns: ColumnsType<Expense> = [
    {
      title: "Expense",
      key: "title",
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center"
            style={{
              background: record.category
                ? hexToRgba(getCategoryColor(record.category), 0.12)
                : "#f3f4f6",
            }}
          >
            {record.category?.icon ? (
              <DynamicLucideIcon
                name={record.category.icon}
                size={16}
                color={getCategoryColor(record.category)}
              />
            ) : (
              <Receipt size={16} color="#9ca3af" strokeWidth={2} />
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm leading-tight m-0">
              {record.title}
            </p>
            {record.vendor_name && (
              <div className="flex items-center gap-1 mt-0.5">
                <Store size={10} color="#9ca3af" strokeWidth={2} />
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {record.vendor_name}
                </span>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Category",
      key: "category",
      width: 180,
      render: (_, record) => {
        if (!record.category)
          return <span className="text-gray-300 text-xs">—</span>;
        const color = getCategoryColor(record.category);
        return (
          <div
            className="inline-flex items-center gap-0 rounded-lg overflow-hidden"
            style={{
              background: hexToRgba(color, 0.08),
              border: `1px solid ${hexToRgba(color, 0.2)}`,
              maxWidth: 170,
            }}
          >
            <div
              className="w-1 self-stretch shrink-0"
              style={{ background: color }}
            />
            <div className="flex items-center gap-1.5 py-1 px-2.5">
              <DynamicLucideIcon
                name={record.category.icon || "Tag"}
                size={12}
                color={color}
              />
              <span
                className="text-[11px] font-semibold truncate"
                style={{ color }}
              >
                {record.category.name}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      sorter: (a, b) => Number(a.amount) - Number(b.amount),
      width: 130,
      render: (amount: number) => (
        <span className="font-bold text-gray-900 dark:text-white text-sm tabular-nums">
          $
          {Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: "Date",
      dataIndex: "expense_date",
      key: "expense_date",
      sorter: (a, b) =>
        dayjs(a.expense_date).unix() - dayjs(b.expense_date).unix(),
      defaultSortOrder: "descend",
      width: 140,
      render: (date: string) => (
        <div>
          <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">
            {dayjs(date).format("MMM D, YYYY")}
          </span>
          <p className="text-gray-400 text-xs mt-0.5 m-0">
            {dayjs(date).fromNow()}
          </p>
        </div>
      ),
    },
    {
      title: "Payment",
      dataIndex: "payment_method",
      key: "payment_method",
      width: 150,
      render: (method: string) => {
        if (!method || !isPaymentMethodKey(method))
          return <span className="text-gray-300 text-xs">—</span>;
        const cfg = PAYMENT_METHOD_CONFIG[method];
        return (
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
            style={{ background: cfg.bg }}
          >
            <CreditCard size={11} color={cfg.color} strokeWidth={2.5} />
            <span
              className="text-[11px] font-semibold"
              style={{ color: cfg.color }}
            >
              {cfg.label}
            </span>
          </div>
        );
      },
    },
    {
      title: "Platform",
      dataIndex: "platform",
      key: "platform",
      width: 110,
      render: (platform: string) =>
        platform ? (
          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-md px-2 py-1 font-medium">
            {platform}
          </span>
        ) : (
          <span className="text-gray-200 text-xs">—</span>
        ),
    },
    {
      title: "Notes",
      dataIndex: "notes",
      key: "notes",
      render: (notes: string) =>
        notes ? (
          <Tooltip title={notes} placement="topLeft">
            <div className="flex items-center gap-1.5 cursor-pointer group">
              <FileText size={12} color="#a5b4fc" strokeWidth={2} />
              <span className="text-gray-400 text-xs truncate max-w-25 group-hover:text-indigo-500 transition-colors">
                {notes}
              </span>
            </div>
          </Tooltip>
        ) : (
          <span className="text-gray-200 text-xs">—</span>
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
        >
          <Button
            type="text"
            icon={<MoreOutlined />}
            size="small"
            className="text-gray-300 rounded-lg hover:bg-gray-100 hover:text-gray-600"
            aria-label="Row actions"
          />
        </Dropdown>
      ),
    },
  ];

  return (
    <>
      {/* ── Desktop table ── */}
      <div
        className="
        hidden md:block
        bg-white dark:bg-gray-800
        rounded-2xl border border-gray-100 dark:border-gray-700
        shadow-sm overflow-hidden
      "
      >
        <style>{TABLE_STYLES}</style>
        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="id"
          className="expense-table"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => (
              <span className="text-gray-400 text-sm">
                {total} expense{total !== 1 ? "s" : ""}
              </span>
            ),
            style: { padding: "12px 20px", borderTop: "1px solid #f0f0f5" },
          }}
          locale={{ emptyText: emptyState }}
        />
      </div>

      {/* ── Mobile card list ── */}
      <div className="flex md:hidden flex-col gap-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : data.length === 0 ? (
          emptyState
        ) : (
          data.map((record) => (
            <ExpenseCard
              key={record.id}
              record={record}
              deletingId={deletingId}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </>
  );
}

export default memo(ExpenseTable);
