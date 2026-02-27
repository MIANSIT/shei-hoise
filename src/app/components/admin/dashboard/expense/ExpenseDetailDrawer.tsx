"use client";

import { Button, Drawer, Popconfirm, Spin } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { Expense } from "@/lib/types/expense/type";
import { ExpenseDetailContent } from "./ExpenseDetailContent";
// import { ReceiptText } from "lucide-react";
// import { getCategoryColor, hexToRgba } from "@/lib/types/expense/expense-utils";
// import DynamicLucideIcon from "./DynamicLucideIcon";
// import { Building2 } from "lucide-react";

interface ExpenseDetailDrawerProps {
  expense: Expense | null;
  open: boolean;
  currencyIcon: React.ReactNode;
  onClose: () => void;
  onEdit: (e: Expense) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}

export function ExpenseDetailDrawer({
  expense,
  open,
  currencyIcon,
  onClose,
  onEdit,
  onDelete,
  deletingId,
}: ExpenseDetailDrawerProps) {
  if (!expense) return null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={380}
      placement="right"
      closable={false}
      styles={{
        body: { padding: 0 },
        header: { display: "none" },
      }}
      className="dark:[&_.ant-drawer-content]:bg-gray-800 dark:[&_.ant-drawer-body]:bg-gray-800"
    >
      {/* Close button */}
      <div className="flex justify-end px-5 pt-4">
        <Button
          type="text"
          size="small"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-lg"
        >
          ✕
        </Button>
      </div>

      <ExpenseDetailContent expense={expense} currencyIcon={currencyIcon} />

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex gap-2 mt-2">
        <Button
          block
          icon={<EditOutlined />}
          onClick={() => { onEdit(expense); onClose(); }}
          className="rounded-xl h-9 font-semibold"
          style={{ borderColor: "#6366f1", color: "#6366f1" }}
        >
          Edit
        </Button>
        <Popconfirm
          title="Delete expense?"
          description="This action cannot be undone."
          onConfirm={() => { onDelete(expense.id); onClose(); }}
          okText="Delete"
          cancelText="Cancel"
          okButtonProps={{ danger: true }}
        >
          <Button
            block
            danger
            icon={deletingId === expense.id ? <Spin size="small" /> : <DeleteOutlined />}
            className="rounded-xl h-9 font-semibold"
          >
            Delete
          </Button>
        </Popconfirm>
      </div>
    </Drawer>
  );
}