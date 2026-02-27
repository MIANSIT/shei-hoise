"use client";

import { Modal } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { ExpenseCategory } from "@/lib/types/expense/type";

interface DeleteConfirmModalProps {
  open: boolean;
  target: ExpenseCategory | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmModal({
  open,
  target,
  onClose,
  onConfirm,
}: DeleteConfirmModalProps) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={onConfirm}
      okType="danger"
      okText="Delete"
      centered
      style={{ borderRadius: "16px" }}
      className="[&_.ant-modal-content]:rounded-2xl [&_.ant-modal-content]:p-7 [&_.ant-modal-footer]:border-t [&_.ant-modal-footer]:border-gray-100 [&_.ant-modal-footer]:pt-4 [&_.ant-modal-footer]:mt-2"
      title={
        <div className="flex items-center gap-2 text-red-500">
          <DeleteOutlined />
          <span className="text-base font-bold">Delete Category</span>
        </div>
      }
    >
      <div className="py-2">
        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-gray-900 dark:text-gray-300">
            {target?.name}
          </span>
          ?
        </p>
        <p className="text-gray-400 dark:text-gray-100 text-xs mt-2">
          This action cannot be undone. Expenses linked to this category may be
          affected.
        </p>
      </div>
    </Modal>
  );
}
