"use client";

import { memo, useEffect } from "react";
import { Modal, Button, Form, Input, Select, InputNumber } from "antd";
import { EditOutlined } from "@ant-design/icons";
import { Plus } from "lucide-react";
import type { Vendor, VendorFormValues } from "@/lib/types/vendor/type";

type ModalMode = "create" | "edit";

interface VendorFormModalProps {
  open: boolean;
  mode: ModalMode;
  editingVendor: Vendor | null;
  submitting: boolean;
  onSubmit: (values: VendorFormValues) => void;
  onCancel: () => void;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-semibold text-gray-700 dark:text-gray-300 text-[13px]">
      {children}
    </span>
  );
}

function VendorFormModal({
  open,
  mode,
  editingVendor,
  submitting,
  onSubmit,
  onCancel,
}: VendorFormModalProps) {
  const [form] = Form.useForm<VendorFormValues>();

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && editingVendor) {
      form.setFieldsValue({
        name: editingVendor.name,
        phone: editingVendor.phone,
        address: editingVendor.address || undefined,
        business_name: editingVendor.business_name || undefined,
        notes: editingVendor.notes || undefined,
        status: editingVendor.status,
        credit_limit: editingVendor.credit_limit || undefined,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ status: "active" });
    }
  }, [open, mode, editingVendor, form]);

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
      width={520}
      maskClosable={!submitting}
      closable={!submitting}
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
            {mode === "create" ? "Add Vendor" : "Edit Vendor"}
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
            {mode === "create" ? "Save Vendor" : "Update Vendor"}
          </Button>
        </div>
      }
    >
      <div className="px-6 pt-5 pb-2">
        <Form form={form} layout="vertical">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Form.Item
              name="name"
              label={<FieldLabel>Vendor Name</FieldLabel>}
              rules={[
                { required: true, message: "Vendor name is required" },
                { max: 255, message: "Maximum 255 characters" },
              ]}
            >
              <Input placeholder="e.g. Karim Traders" className="rounded-lg h-9.5" maxLength={255} />
            </Form.Item>

            <Form.Item
              name="phone"
              label={<FieldLabel>Phone Number</FieldLabel>}
              rules={[
                { required: true, message: "Phone number is required" },
                { max: 30, message: "Maximum 30 characters" },
              ]}
            >
              <Input placeholder="e.g. 01712345678" className="rounded-lg h-9.5" maxLength={30} />
            </Form.Item>
          </div>

          <Form.Item
            name="business_name"
            label={<FieldLabel>Business Name (Optional)</FieldLabel>}
            rules={[{ max: 255, message: "Maximum 255 characters" }]}
          >
            <Input placeholder="e.g. Karim Traders & Co." className="rounded-lg h-9.5" maxLength={255} />
          </Form.Item>

          <Form.Item name="address" label={<FieldLabel>Address</FieldLabel>}>
            <Input.TextArea rows={2} placeholder="Vendor address" className="rounded-lg" maxLength={500} showCount />
          </Form.Item>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Form.Item
              name="status"
              label={<FieldLabel>Status</FieldLabel>}
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
                className="rounded-lg"
              />
            </Form.Item>

            <Form.Item
              name="credit_limit"
              label={<FieldLabel>Credit Limit (Optional)</FieldLabel>}
              tooltip="Warn before dispatching new stock once this vendor's due crosses this amount. Leave blank for no limit."
            >
              <InputNumber min={0} placeholder="No limit" className="w-full rounded-lg h-9.5" />
            </Form.Item>
          </div>

          <Form.Item
            name="notes"
            label={<FieldLabel>Notes (Optional)</FieldLabel>}
            style={{ marginBottom: 0 }}
          >
            <Input.TextArea rows={2} placeholder="Any additional notes" className="rounded-lg" maxLength={500} showCount />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
}

export default memo(VendorFormModal);
