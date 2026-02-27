"use client";

import { useState } from "react";
import { Drawer, Button, Popconfirm, Spin } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { Receipt, Store, Calendar } from "lucide-react";
import dayjs from "dayjs";
import type { Expense } from "@/lib/types/expense/type";
import DynamicLucideIcon from "./DynamicLucideIcon";
import { getCategoryColor, hexToRgba } from "@/lib/types/expense/expense-utils";
import { AmountCell, CategoryCell, PaymentCell } from "./ExpenseTableCells";
import { ExpenseDetailContent } from "./ExpenseDetailContent";

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
  const color = record.category ? getCategoryColor(record.category) : "#6366f1";
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      {/* Card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm transition-all hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-900 active:scale-[0.99] ">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
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
              <p className="font-semibold text-gray-900 dark:text-white text-sm leading-tight truncate m-0">
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
          <AmountCell
            amount={Number(record.amount)}
            currencyIcon={currencyIcon}
          />
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {record.category && <CategoryCell record={record} />}
          {record.payment_method && (
            <PaymentCell method={record.payment_method} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            <Calendar size={11} strokeWidth={2} />
            <span>{dayjs(record.expense_date).format("MMM D, YYYY")}</span>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span>{dayjs(record.expense_date).fromNow()}</span>
          </div>
          <div
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg"
            style={{ background: hexToRgba(color, 0.1), color }}
            onClick={() => setDrawerOpen(true)}
          >
            <span>View details</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </div>
      </div>

      {/* Bottom sheet drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        placement="bottom"
        size="auto"
        closable={false}
        styles={{
          body: { padding: 0 },
          header: { display: "none" },
          wrapper: { borderRadius: "20px 20px 0 0", overflow: "hidden" },
        }}
        className="dark:[&_.ant-drawer-content]:bg-gray-800 dark:[&_.ant-drawer-body]:bg-gray-800"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 bg-white dark:bg-gray-800">
          <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-600" />
        </div>

        <ExpenseDetailContent expense={record} currencyIcon={currencyIcon} />

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex gap-2">
          <Button
            block
            icon={<EditOutlined />}
            onClick={() => {
              onEdit(record);
              setDrawerOpen(false);
            }}
            className="rounded-xl h-10 font-semibold"
            style={{ borderColor: "#6366f1", color: "#6366f1" }}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete expense?"
            description="This action cannot be undone."
            onConfirm={() => {
              onDelete(record.id);
              setDrawerOpen(false);
            }}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button
              block
              danger
              icon={
                deletingId === record.id ? (
                  <Spin size="small" />
                ) : (
                  <DeleteOutlined />
                )
              }
              className="rounded-xl h-10 font-semibold"
            >
              Delete
            </Button>
          </Popconfirm>
        </div>
      </Drawer>
    </>
  );
}
