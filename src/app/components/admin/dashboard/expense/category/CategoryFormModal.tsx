"use client";

import { useEffect, useState } from "react";
import { Modal, Form, Input, Switch } from "antd";
import { ExpenseCategory } from "@/lib/types/expense/type";
import { ColorPicker, DEFAULT_COLOR } from "@/app/components/admin/dashboard/expense/category/iconForm/ColorPicker";
import { IconPicker } from "@/app/components/admin/dashboard/expense/category/iconForm/IconPicker";
import { CategoryPreview } from "@/app/components/admin/dashboard/expense/category/iconForm/CategoryPreview";

interface FormValues {
  name: string;
  description?: string;
  is_active?: boolean;
  icon?: string;
  color?: string;
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
  const [preview, setPreview] = useState<FormValues>({
    name: "",
    is_active: true,
    color: DEFAULT_COLOR,
  });

  useEffect(() => {
    if (!open) return;
    if (editingCategory) {
      const vals: FormValues = {
        name: editingCategory.name,
        description: editingCategory.description,
        is_active: editingCategory.is_active,
        icon: editingCategory.icon ?? undefined,
        color: editingCategory.color ?? DEFAULT_COLOR,
      };
      form.setFieldsValue(vals);
      setPreview(vals);
    } else {
      form.resetFields();
      form.setFieldsValue({ is_active: true, color: DEFAULT_COLOR });
      setPreview({ name: "", is_active: true, color: DEFAULT_COLOR });
    }
  }, [open, editingCategory, form]);

  const accentColor = preview.color || DEFAULT_COLOR;

  return (
    <Modal
      title={
        <span className="text-base font-bold text-ring">
          {editingCategory ? "Edit Category" : "New Category"}
        </span>
      }
      open={open}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      onOk={async () => {
        const v = await form.validateFields();
        onSubmit(v);
      }}
      confirmLoading={saving}
      okText={editingCategory ? "Save Changes" : "Create"}
      centered
      className="[&_.ant-modal-content]:rounded-2xl [&_.ant-modal-content]:p-7 [&_.ant-modal-header]:border-b [&_.ant-modal-header]:border-ring [&_.ant-modal-header]:pb-3 [&_.ant-modal-header]:mb-5 [&_.ant-modal-footer]:border-t [&_.ant-modal-footer]:border-ring [&_.ant-modal-footer]:pt-4 [&_.ant-modal-footer]:mt-2"
    >
      <Form
        form={form}
        layout="vertical"
        style={{ fontFamily: "inherit" }}
        onValuesChange={(_, all) => setPreview(all)}
      >
        {/* Live Preview */}
        <div className="mb-5">
          <CategoryPreview
            name={preview.name ?? ""}
            description={preview.description}
            icon={preview.icon}
            isActive={preview.is_active ?? true}
            color={accentColor}
          />
        </div>

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
            placeholder="e.g. Marketing, Operations…"
            className="rounded-xl"
            style={{ height: 44 }}
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
            rows={2}
            placeholder="Optional — describe what expenses belong here"
            className="rounded-xl"
            style={{ resize: "none" }}
          />
        </Form.Item>

        <Form.Item
          name="color"
          label={
            <span className="text-sm font-semibold text-primary">Color</span>
          }
        >
          <ColorPicker />
        </Form.Item>

        <Form.Item
          name="icon"
          label={
            <span className="text-sm font-semibold text-primary">Icon</span>
          }
        >
          <IconPicker accentColor={accentColor} />
        </Form.Item>

        <Form.Item
          name="is_active"
          label={
            <span className="text-sm font-semibold text-primary">Active</span>
          }
          valuePropName="checked"
          style={{ marginBottom: 0 }}
        >
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}
