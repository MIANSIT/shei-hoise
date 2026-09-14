"use client";

import { useEffect, useState } from "react";
import { Modal, Button, Form, Input, Switch } from "antd";
import { EditOutlined } from "@ant-design/icons";
import { Plus } from "lucide-react";
import { ImageUploader } from "@/app/components/admin/dashboard/store-settings/storeCard/ImageUploader";
import type { HeroSlide } from "@/lib/types/heroSlide";

type ModalMode = "create" | "edit";

export interface SlideFormValues {
  headline?: string | null;
  subtext?: string | null;
  button_text?: string | null;
  button_link?: string | null;
  is_active: boolean;
}

interface SlideFormModalProps {
  open: boolean;
  mode: ModalMode;
  editingSlide: HeroSlide | null;
  submitting: boolean;
  onSubmit: (values: SlideFormValues, file: File | null) => void;
  onCancel: () => void;
}

export default function SlideFormModal({
  open,
  mode,
  editingSlide,
  submitting,
  onSubmit,
  onCancel,
}: SlideFormModalProps) {
  const [form] = Form.useForm<SlideFormValues>();
  const [file, setFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setImageError(null);
    if (mode === "edit" && editingSlide) {
      form.setFieldsValue({
        headline: editingSlide.headline ?? undefined,
        subtext: editingSlide.subtext ?? undefined,
        button_text: editingSlide.button_text ?? undefined,
        button_link: editingSlide.button_link ?? undefined,
        is_active: editingSlide.is_active,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ is_active: true });
    }
  }, [open, mode, editingSlide, form]);

  const handleOk = async () => {
    if (mode === "create" && !file) {
      setImageError("A slide image is required.");
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
            {mode === "create" ? "Add Hero Slide" : "Edit Hero Slide"}
          </span>
        </div>
      }
      footer={
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
          <Button className="rounded-xl h-9 font-medium" onClick={handleCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button type="primary" loading={submitting} onClick={handleOk} className="rounded-xl h-9 font-semibold">
            {mode === "create" ? "Add Slide" : "Save Changes"}
          </Button>
        </div>
      }
    >
      <div className="px-6 pt-5 pb-2">
        <ImageUploader
          value={editingSlide?.image_url}
          onChange={(f) => {
            setFile(f);
            if (f) setImageError(null);
          }}
          label="Slide Image"
          aspectHint="16:5 recommended"
        />
        {imageError && <p className="mt-1 text-xs text-destructive">{imageError}</p>}

        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="headline" label="Headline (optional)">
            <Input placeholder="e.g. Autumn Edit, Curated For You" maxLength={120} className="rounded-lg h-9.5" />
          </Form.Item>
          <Form.Item name="subtext" label="Subtext (optional)">
            <Input.TextArea placeholder="A short line under the headline" maxLength={240} rows={2} className="rounded-lg" />
          </Form.Item>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="button_text" label="Button Text (optional)">
              <Input placeholder="e.g. Shop Now" maxLength={40} className="rounded-lg h-9.5" />
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
