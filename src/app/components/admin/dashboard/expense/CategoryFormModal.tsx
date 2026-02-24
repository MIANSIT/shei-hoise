"use client";

import { useEffect } from "react";
import { Modal, Form, Input, Switch } from "antd";
import { ExpenseCategory } from "@/lib/types/expense/type";

interface FormValues {
  name: string;
  description?: string;
  is_active?: boolean;
}

interface CategoryFormModalProps {
  open: boolean;
  saving: boolean;
  editingCategory: ExpenseCategory | null;
  onClose: () => void;
  onSubmit: (values: FormValues) => void;
}

export function CategoryFormModal({
  open,
  saving,
  editingCategory,
  onClose,
  onSubmit,
}: CategoryFormModalProps) {
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    if (open) {
      if (editingCategory) {
        form.setFieldsValue({
          name: editingCategory.name,
          description: editingCategory.description,
          is_active: editingCategory.is_active,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ is_active: true });
      }
    }
  }, [open, editingCategory, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    onSubmit(values);
  };

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={
        <span className="text-base font-bold text-ring">
          {editingCategory ? "Edit Category" : "New Category"}
        </span>
      }
      open={open}
      onCancel={handleClose}
      onOk={handleOk}
      confirmLoading={saving}
      okText={editingCategory ? "Save Changes" : "Create"}
      centered
      className="[&_.ant-modal-content]:rounded-2xl [&_.ant-modal-content]:p-7 [&_.ant-modal-header]:border-b [&_.ant-modal-header]:border-ring [&_.ant-modal-header]:pb-3 [&_.ant-modal-header]:mb-5 [&_.ant-modal-footer]:border-t [&_.ant-modal-footer]:border-ring [&_.ant-modal-footer]:pt-4 [&_.ant-modal-footer]:mt-2"
    >
      <Form form={form} layout="vertical" style={{ fontFamily: "inherit" }}>
        <Form.Item
          name="name"
          label={
            <span className="text-sm font-semibold text-primary">
              Category Name
            </span>
          }
          rules={[{ required: true, message: "Category name is required" }]}
        >
          <Input
            placeholder="e.g. Marketing, Operations..."
            className="rounded-xl"
            style={{ height: "40px" }}
          />
        </Form.Item>

        <Form.Item
          name="description"
          label={
            <span className="text-sm font-semibold text-primary">
              Description
            </span>
          }
        >
          <Input.TextArea
            rows={3}
            placeholder="Optional — describe what expenses belong here"
            className="rounded-xl"
            style={{ resize: "none" }}
          />
        </Form.Item>

        <Form.Item
          name="is_active"
          label={
            <span className="text-sm font-semibold text-primary">Active</span>
          }
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}
