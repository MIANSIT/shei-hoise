"use client";

import { useEffect, useState } from "react";
import { Modal, Form, Input, Switch, Button } from "antd";
import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import { ExpenseCategory } from "@/lib/types/expense/type";
import {
  ColorPicker,
  DEFAULT_COLOR,
} from "@/app/components/admin/dashboard/expense/category/iconForm/ColorPicker";
import { IconPicker } from "@/app/components/admin/dashboard/expense/category/iconForm/IconPicker";
import { CategoryPreview } from "@/app/components/admin/dashboard/expense/category/iconForm/CategoryPreview";
import { useTranslation } from "@/lib/hook/useTranslation";

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
  const t = useTranslation();
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

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  const handleOk = async () => {
    const v = await form.validateFields();
    onSubmit(v);
  };

  return (
    <Modal
      open={open}
      onCancel={handleCancel}
      width={520}
      maskClosable={!saving}
      closable={!saving}
      styles={{ body: { padding: 0 } }}
      className="expense-modal"
      style={{ borderRadius: 20, overflow: "hidden" }}
      title={
        <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}
          >
            {editingCategory ? (
              <EditOutlined style={{ color: "white", fontSize: 14 }} />
            ) : (
              <PlusOutlined style={{ color: "white", fontSize: 14 }} />
            )}
          </div>
          <span className="text-base font-bold text-gray-900 dark:text-white">
            {editingCategory ? t.admin.catEditTitle : t.admin.catNewTitle}
          </span>
        </div>
      }
      footer={
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
          <Button
            className="rounded-xl h-9 font-medium"
            onClick={handleCancel}
            disabled={saving}
          >
            {t.admin.catCancelBtn}
          </Button>
          <Button
            type="primary"
            loading={saving}
            onClick={handleOk}
            className="rounded-xl h-9 font-semibold border-none"
            style={{
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              boxShadow: "0 4px 14px rgba(102,126,234,0.4)",
            }}
          >
            {editingCategory ? t.admin.catSaveBtn : t.admin.catCreateBtn}
          </Button>
        </div>
      }
    >
      <div className="px-6 py-4">
        <Form
          form={form}
          layout="vertical"
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
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t.admin.catNameLabel}
              </span>
            }
            rules={[{ required: true, message: t.admin.catNameRequired }]}
          >
            <Input
              placeholder={t.admin.catNamePlaceholder}
              className="rounded-xl"
              style={{ height: 44 }}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label={
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t.admin.catDescLabel}
              </span>
            }
          >
            <Input.TextArea
              rows={2}
              placeholder={t.admin.catDescPlaceholder}
              className="rounded-xl"
              style={{ resize: "none" }}
            />
          </Form.Item>

          <Form.Item
            name="color"
            label={
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t.admin.catColorLabel}
              </span>
            }
          >
            <ColorPicker />
          </Form.Item>

          <Form.Item
            name="icon"
            label={
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t.admin.catIconLabel}
              </span>
            }
          >
            <IconPicker accentColor={accentColor} />
          </Form.Item>

          <Form.Item
            name="is_active"
            label={
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t.admin.catActiveLabel}
              </span>
            }
            valuePropName="checked"
            style={{ marginBottom: 0 }}
          >
            <Switch />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
}
