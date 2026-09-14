"use client";

import { useEffect, useState } from "react";
import { Modal, Button, Form, Input, Switch } from "antd";
import { EditOutlined } from "@ant-design/icons";
import { Plus } from "lucide-react";
import { ImageUploader } from "@/app/components/admin/dashboard/store-settings/storeCard/ImageUploader";
import type { PromoBanner } from "@/lib/types/promoBanner";

type ModalMode = "create" | "edit";

export interface PromoBannerFormValues {
  headline?: string | null;
  subtext?: string | null;
  button_text?: string | null;
  button_link?: string | null;
  is_active: boolean;
}

interface PromoBannerFormModalProps {
  open: boolean;
  mode: ModalMode;
  editingBanner: PromoBanner | null;
  submitting: boolean;
  onSubmit: (values: PromoBannerFormValues, file: File | null) => void;
  onCancel: () => void;
}

export default function PromoBannerFormModal({
  open,
  mode,
  editingBanner,
  submitting,
  onSubmit,
  onCancel,
}: PromoBannerFormModalProps) {
  const [form] = Form.useForm<PromoBannerFormValues>();
  const [file, setFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setImageError(null);
    if (mode === "edit" && editingBanner) {
      form.setFieldsValue({
        headline: editingBanner.headline ?? undefined,
        subtext: editingBanner.subtext ?? undefined,
        button_text: editingBanner.button_text ?? undefined,
        button_link: editingBanner.button_link ?? undefined,
        is_active: editingBanner.is_active,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ is_active: true });
    }
  }, [open, mode, editingBanner, form]);

  const handleOk = async () => {
    if (mode === "create" && !file) {
      setImageError("A banner image is required.");
      return;
    }
    try {
      const values = await form.validateFields();
      onSubmit(values, file);
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
      width={520}
      maskClosable={!submitting}
      closable={!submitting}
      styles={{ body: { borderRadius: 20, padding: 0 } }}
      title={
        <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-border">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0">
            {mode === "create" ? (
              <Plus size={16} className="text-primary-foreground" strokeWidth={2.5} />
            ) : (
              <EditOutlined style={{ color: "var(--primary-foreground)", fontSize: 14 }} />
            )}
          </div>
          <span className="text-base font-bold text-foreground">
            {mode === "create" ? "Add Promo Banner" : "Edit Promo Banner"}
          </span>
        </div>
      }
      footer={
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
          <Button className="rounded-xl h-9 font-medium" onClick={handleCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button type="primary" loading={submitting} onClick={handleOk} className="rounded-xl h-9 font-semibold">
            {mode === "create" ? "Add Banner" : "Save Changes"}
          </Button>
        </div>
      }
    >
      <div className="px-6 pt-5 pb-2">
        <ImageUploader
          value={editingBanner?.image_url}
          onChange={(f) => {
            setFile(f);
            if (f) setImageError(null);
          }}
          label="Banner Image"
          aspectHint="4:3 recommended"
        />
        {imageError && <p className="mt-1 text-xs text-destructive">{imageError}</p>}

        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="headline" label="Heading (optional)">
            <Input placeholder="e.g. New Arrivals Are Here" maxLength={120} className="rounded-lg h-9.5" />
          </Form.Item>
          <Form.Item name="subtext" label="Eyebrow / Short Line (optional)">
            <Input placeholder="e.g. Just In" maxLength={240} className="rounded-lg h-9.5" />
          </Form.Item>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="button_text" label="Button Text (optional)">
              <Input placeholder="e.g. Shop New In" maxLength={40} className="rounded-lg h-9.5" />
            </Form.Item>
            <Form.Item
              name="button_link"
              label="Button Link"
              dependencies={["button_text"]}
              rules={[
                ({ getFieldValue }) => ({
                  validator: (_, value) => {
                    if (getFieldValue("button_text") && !value) {
                      return Promise.reject(new Error("Required when button text is set"));
                    }
                    return Promise.resolve();
                  },
                }),
              ]}
            >
              <Input placeholder="/shop" className="rounded-lg h-9.5" />
            </Form.Item>
          </div>
          <Form.Item name="is_active" label="Active" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Switch />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
}
