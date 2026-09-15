"use client";

import { useEffect } from "react";
import { Modal, Button, Form, Input, Switch } from "antd";
import { EditOutlined } from "@ant-design/icons";
import { Plus } from "lucide-react";
import type { Announcement } from "@/lib/types/announcement";

type ModalMode = "create" | "edit";

export interface AnnouncementFormValues {
  text: string;
  is_active: boolean;
}

interface AnnouncementFormModalProps {
  open: boolean;
  mode: ModalMode;
  editingAnnouncement: Announcement | null;
  submitting: boolean;
  onSubmit: (values: AnnouncementFormValues) => void;
  onCancel: () => void;
}

export default function AnnouncementFormModal({
  open,
  mode,
  editingAnnouncement,
  submitting,
  onSubmit,
  onCancel,
}: AnnouncementFormModalProps) {
  const [form] = Form.useForm<AnnouncementFormValues>();

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && editingAnnouncement) {
      form.setFieldsValue({
        text: editingAnnouncement.text,
        is_active: editingAnnouncement.is_active,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ is_active: true });
    }
  }, [open, mode, editingAnnouncement, form]);

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
      width={480}
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
            {mode === "create" ? "Add Announcement" : "Edit Announcement"}
          </span>
        </div>
      }
      footer={
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
          <Button className="rounded-xl h-9 font-medium" onClick={handleCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button type="primary" loading={submitting} onClick={handleOk} className="rounded-xl h-9 font-semibold">
            {mode === "create" ? "Add Announcement" : "Save Changes"}
          </Button>
        </div>
      }
    >
      <div className="px-6 pt-5 pb-2">
        <Form form={form} layout="vertical">
          <Form.Item
            name="text"
            label="Announcement Text"
            rules={[{ required: true, message: "Announcement text is required" }]}
          >
            <Input.TextArea
              placeholder="e.g. Eid Sale — up to 30% off, this week only"
              maxLength={200}
              showCount
              autoSize={{ minRows: 2, maxRows: 3 }}
              className="rounded-lg"
            />
          </Form.Item>
          <Form.Item name="is_active" label="Active" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Switch />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
}
