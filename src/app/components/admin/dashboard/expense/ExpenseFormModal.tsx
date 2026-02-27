"use client";

import { memo, useEffect, useMemo } from "react";
import {
  Modal,
  Button,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
} from "antd";
import { EditOutlined } from "@ant-design/icons";
import { Plus } from "lucide-react";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import type {
  Expense,
  ExpenseCategory,
  ExpenseFormValues,
} from "@/lib/types/expense/type";
import { PAYMENT_METHOD_CONFIG } from "@/lib/types/expense/expense-constants";
import {
  buildCategoryOptions,
  renderCategoryOption,
  type CategoryOption,
} from "./CategorySelectOptions";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";

type ModalMode = "create" | "edit";

interface ExpenseFormModalProps {
  open: boolean;
  mode: ModalMode;
  editingExpense: Expense | null;
  categories: ExpenseCategory[];
  submitting: boolean;
  onSubmit: (values: ExpenseFormValues) => void;
  onCancel: () => void;
}

const PAYMENT_OPTIONS = Object.entries(PAYMENT_METHOD_CONFIG).map(
  ([key, cfg]) => ({
    value: key,
    label: cfg.label,
    color: cfg.color,
  }),
);

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-semibold text-gray-700 dark:text-gray-300 text-[13px]">
      {children}
    </span>
  );
}

function ExpenseFormModal({
  open,
  mode,
  editingExpense,
  categories,
  submitting,
  onSubmit,
  onCancel,
}: ExpenseFormModalProps) {
  const [form] = Form.useForm<ExpenseFormValues>();
  const { icon: currencyIcon } = useUserCurrencyIcon();
  const categoryOptions = useMemo(
    () => buildCategoryOptions(categories),
    [categories],
  );

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && editingExpense) {
      form.setFieldsValue({
        title: editingExpense.title,
        amount: editingExpense.amount,
        expense_date: dayjs(editingExpense.expense_date),
        category_id: editingExpense.category_id || undefined,
        description: editingExpense.description || undefined,
        payment_method: editingExpense.payment_method || undefined,
        platform: editingExpense.platform || undefined,
        vendor_name: editingExpense.vendor_name || undefined,
        notes: editingExpense.notes || undefined,
      });
    } else {
      form.resetFields();
    }
  }, [open, mode, editingExpense, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSubmit(values);
    } catch {
      /* inline errors shown by Ant Design */
    }
  };

  const handleCancel = () => {
    if (!submitting) onCancel();
  };

  return (
    <Modal
      open={open}
      onCancel={handleCancel}
      width={560}
      maskClosable={!submitting}
      closable={!submitting}
      className="expense-modal"
      styles={{ body: { borderRadius: 20, padding: 0 } }}
      title={
        <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="w-8 h-8 rounded-xl bg-linear-to-br from-indigo-400 to-purple-600 flex items-center justify-center shrink-0">
            {mode === "create" ? (
              <Plus size={16} color="white" strokeWidth={2.5} />
            ) : (
              <EditOutlined style={{ color: "white", fontSize: 14 }} />
            )}
          </div>
          <span className="text-base font-bold text-gray-900 dark:text-white">
            {mode === "create" ? "New Expense" : "Edit Expense"}
          </span>
        </div>
      }
      footer={
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
          <Button
            className="rounded-xl h-9 font-medium"
            onClick={handleCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="primary"
            loading={submitting}
            onClick={handleOk}
            className="rounded-xl h-9 font-semibold border-none"
            style={{
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              boxShadow: "0 4px 14px rgba(102,126,234,0.4)",
            }}
          >
            {mode === "create" ? "Save Expense" : "Update Expense"}
          </Button>
        </div>
      }
    >
      <div className="px-6 pt-5 pb-2">
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label={<FieldLabel>Title</FieldLabel>}
            rules={[
              { required: true, message: "Title is required" },
              { max: 255, message: "Max 255 characters" },
            ]}
          >
            <Input
              placeholder="e.g. Office Supplies"
              className="rounded-lg h-9.5"
              maxLength={255}
            />
          </Form.Item>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Form.Item
              name="amount"
              label={<FieldLabel>Amount</FieldLabel>}
              rules={[
                { required: true, message: "Amount is required" },
                {
                  type: "number",
                  min: 0.01,
                  message: "Must be greater than 0",
                },
              ]}
            >
              <InputNumber
                prefix={currencyIcon ?? "$"}
                min={0}
                precision={2}
                className="rounded-lg w-full h-9.5"
              />
            </Form.Item>

            <Form.Item
              name="expense_date"
              label={<FieldLabel>Date</FieldLabel>}
              rules={[{ required: true, message: "Date is required" }]}
            >
              <DatePicker
                className="rounded-lg w-full h-9.5"
                disabledDate={(d: Dayjs) => d.isAfter(new Date())}
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Form.Item
              name="category_id"
              label={<FieldLabel>Category</FieldLabel>}
            >
              <Select
                placeholder="Select category"
                allowClear
                showSearch={{
                  filterOption: (input, option) =>
                    (option as CategoryOption)?.label
                      ?.toLowerCase()
                      .includes(input.toLowerCase()) ?? false,
                }}
                options={categoryOptions}
                optionRender={renderCategoryOption}
                className="rounded-lg"
              />
            </Form.Item>

            <Form.Item
              name="payment_method"
              label={<FieldLabel>Payment Method</FieldLabel>}
            >
              <Select
                placeholder="Select method"
                allowClear
                options={PAYMENT_OPTIONS}
                optionRender={(option) => (
                  <span
                    style={{
                      color: (option.data as { color: string }).color,
                      fontWeight: 500,
                    }}
                  >
                    {option.label}
                  </span>
                )}
                className="rounded-lg"
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Form.Item
              name="vendor_name"
              label={<FieldLabel>Vendor</FieldLabel>}
              rules={[{ max: 255, message: "Max 255 characters" }]}
            >
              <Input
                placeholder="Vendor name"
                className="rounded-lg h-9.5"
                maxLength={255}
              />
            </Form.Item>

            <Form.Item
              name="platform"
              label={<FieldLabel>Platform</FieldLabel>}
              rules={[{ max: 100, message: "Max 100 characters" }]}
            >
              <Input
                placeholder="e.g. Web, TikTok Ads..."
                className="rounded-lg h-9.5"
                maxLength={100}
              />
            </Form.Item>
          </div>

          <Form.Item
            name="description"
            label={<FieldLabel>Description</FieldLabel>}
            rules={[{ max: 500, message: "Max 500 characters" }]}
          >
            <Input.TextArea
              rows={2}
              placeholder="Brief description..."
              className="rounded-lg"
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item
            name="notes"
            label={<FieldLabel>Notes</FieldLabel>}
            rules={[{ max: 500, message: "Max 500 characters" }]}
            style={{ marginBottom: 0 }}
          >
            <Input.TextArea
              rows={2}
              placeholder="Any additional notes..."
              className="rounded-lg"
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
}

export default memo(ExpenseFormModal);
