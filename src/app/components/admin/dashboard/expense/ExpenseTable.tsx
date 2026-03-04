"use client";

import { memo, useCallback, useState } from "react";
import { Table, Dropdown, Button, Popconfirm, Spin } from "antd";
import { EditOutlined, DeleteOutlined, MoreOutlined } from "@ant-design/icons";
import { ReceiptText } from "lucide-react";
import type { ColumnsType } from "antd/es/table";
import type { MenuProps } from "antd";
import dayjs from "dayjs";
import type { Expense } from "@/lib/types/expense/type";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { ExpenseCard } from "./ExpenseCard";
import {
  ExpenseCell,
  CategoryCell,
  AmountCell,
  DateCell,
  PaymentCell,
} from "./ExpenseTableCells";
import { ExpenseDetailDrawer } from "./ExpenseDetailDrawer";

interface ExpenseTableProps {
  data: Expense[];
  loading: boolean;
  deletingId: string | null;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

const TABLE_STYLES = `
  .expense-table .ant-table-thead > tr > th {
    background: #fafafa !important; color: #6b7280 !important;
    font-size: 11px !important; font-weight: 700 !important;
    text-transform: uppercase !important; letter-spacing: 0.06em !important;
    border-bottom: 1px solid #f0f0f5 !important; padding: 12px 16px !important;
  }
  .dark .expense-table .ant-table-thead > tr > th {
    background: #1f2937 !important; color: #9ca3af !important;
    border-bottom-color: #374151 !important;
  }
  .expense-table .ant-table-tbody > tr > td {
    padding: 14px 16px !important; border-bottom: 1px solid #f9fafb !important;
  }
  .dark .expense-table .ant-table-tbody > tr > td { border-bottom-color: #374151 !important; }
  .expense-table .ant-table-tbody > tr:hover > td { background: #fafbff !important; }
  .dark .expense-table .ant-table-tbody > tr:hover > td { background: #1e293b !important; }
  .expense-table .ant-table-tbody > tr:last-child > td { border-bottom: none !important; }
  .expense-table .ant-table-column-sorter-up.active .anticon,
  .expense-table .ant-table-column-sorter-down.active .anticon { color: #6366f1 !important; }
  .dark .ant-drawer-content { background-color: #1f2937 !important; }
  .dark .ant-drawer-body { background-color: #1f2937 !important; }
`;

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

function ExpenseTable({
  data,
  loading,
  deletingId,
  onEdit,
  onDelete,
}: ExpenseTableProps) {
  const { icon: currencyIcon } = useUserCurrencyIcon();
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openDrawer = useCallback((record: Expense) => {
    setSelectedExpense(record);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const getRowMenuItems = useCallback(
    (record: Expense): MenuProps["items"] => [
      {
        key: "view",
        icon: <ReceiptText size={14} color="#6366f1" />,
        label: (
          <span className="text-gray-700 dark:text-gray-300 text-sm">
            View Details
          </span>
        ),
        onClick: ({ domEvent }) => {
          domEvent.stopPropagation();
          openDrawer(record);
        },
      },
      {
        key: "edit",
        icon: <EditOutlined style={{ color: "#6366f1" }} />,
        label: (
          <span className="text-gray-700 dark:text-gray-300 text-sm">Edit</span>
        ),
        onClick: ({ domEvent }) => {
          domEvent.stopPropagation();
          onEdit(record);
        },
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
            onConfirm={(e) => {
              e?.stopPropagation();
              onDelete(record.id);
            }}
            onCancel={(e) => e?.stopPropagation()}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <span onClick={(e) => e.stopPropagation()}>Delete</span>
          </Popconfirm>
        ),
        onClick: ({ domEvent }) => domEvent.stopPropagation(),
      },
    ],
    [deletingId, onEdit, onDelete, openDrawer],
  );

  const columns: ColumnsType<Expense> = [
    {
      title: "Expense",
      key: "title",
      render: (_, record) => <ExpenseCell record={record} />,
    },
    {
      title: "Category",
      key: "category",
      width: 160,
      render: (_, record) => <CategoryCell record={record} />,
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      sorter: (a, b) => Number(a.amount) - Number(b.amount),
      width: 120,
      render: (amount: number) => (
        <AmountCell amount={Number(amount)} currencyIcon={currencyIcon} />
      ),
    },
    {
      title: "Date",
      dataIndex: "expense_date",
      key: "expense_date",
      sorter: (a, b) =>
        dayjs(a.expense_date).unix() - dayjs(b.expense_date).unix(),
      defaultSortOrder: "descend",
      width: 130,
      render: (date: string) => <DateCell date={date} />,
    },
    {
      title: "Payment",
      dataIndex: "payment_method",
      key: "payment_method",
      width: 140,
      responsive: ["lg"],
      render: (method: string) => <PaymentCell method={method} />,
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
            onClick={(e) => e.stopPropagation()}
            className="text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300"
          />
        </Dropdown>
      ),
    },
  ];

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <style>{TABLE_STYLES}</style>
        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="id"
          className="expense-table"
          locale={{ emptyText: emptyState }}
          pagination={false}
        />
      </div>

      {/* Mobile cards */}
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
              currencyIcon={currencyIcon}
            />
          ))
        )}
      </div>

      <ExpenseDetailDrawer
        expense={selectedExpense}
        open={drawerOpen}
        currencyIcon={currencyIcon}
        onClose={closeDrawer}
        onEdit={onEdit}
        onDelete={onDelete}
        deletingId={deletingId}
      />
    </>
  );
}

export default memo(ExpenseTable);
