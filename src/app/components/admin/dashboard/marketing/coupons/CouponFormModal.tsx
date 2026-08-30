"use client";

import { memo, useEffect } from "react";
import { Modal, Button, Form, Input, Select, InputNumber, DatePicker, Switch } from "antd";
import { EditOutlined } from "@ant-design/icons";
import { Plus } from "lucide-react";
import dayjs, { Dayjs } from "dayjs";
import { CouponDiscountType } from "@/lib/types/enums";
import type { Coupon } from "@/lib/types/coupon";

type ModalMode = "create" | "edit";

export interface CouponFormValues {
  code: string;
  discount_type: CouponDiscountType;
  discount_value: number;
  min_order_amount?: number | null;
  max_discount_amount?: number | null;
  max_uses?: number | null;
  max_uses_per_customer?: number | null;
  starts_at?: Dayjs | null;
  ends_at?: Dayjs | null;
  is_active: boolean;
}

interface CouponFormModalProps {
  open: boolean;
  mode: ModalMode;
  editingCoupon: Coupon | null;
  submitting: boolean;
  onSubmit: (values: CouponFormValues) => void;
  onCancel: () => void;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-semibold text-gray-700 dark:text-gray-300 text-[13px]">
      {children}
    </span>
  );
}

function CouponFormModal({
  open,
  mode,
  editingCoupon,
  submitting,
  onSubmit,
  onCancel,
}: CouponFormModalProps) {
  const [form] = Form.useForm<CouponFormValues>();
  const discountType = Form.useWatch("discount_type", form);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && editingCoupon) {
      form.setFieldsValue({
        code: editingCoupon.code,
        discount_type: editingCoupon.discount_type,
        discount_value: editingCoupon.discount_value,
        min_order_amount: editingCoupon.min_order_amount ?? undefined,
        max_discount_amount: editingCoupon.max_discount_amount ?? undefined,
        max_uses: editingCoupon.max_uses ?? undefined,
        max_uses_per_customer: editingCoupon.max_uses_per_customer ?? undefined,
        starts_at: editingCoupon.starts_at ? dayjs(editingCoupon.starts_at) : null,
        ends_at: editingCoupon.ends_at ? dayjs(editingCoupon.ends_at) : null,
        is_active: editingCoupon.is_active,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ discount_type: CouponDiscountType.PERCENTAGE, is_active: true });
    }
  }, [open, mode, editingCoupon, form]);

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
      styles={{ body: { borderRadius: 20, padding: 0 } }}
      title={
        <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="w-8 h-8 rounded-xl bg-linear-to-br from-emerald-400 to-teal-600 flex items-center justify-center shrink-0">
            {mode === "create" ? (
              <Plus size={16} color="white" strokeWidth={2.5} />
            ) : (
              <EditOutlined style={{ color: "white", fontSize: 14 }} />
            )}
          </div>
          <span className="text-base font-bold text-gray-900 dark:text-white">
            {mode === "create" ? "Add Coupon" : "Edit Coupon"}
          </span>
        </div>
      }
      footer={
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
          <Button className="rounded-xl h-9 font-medium" onClick={handleCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="primary"
            loading={submitting}
            onClick={handleOk}
            className="rounded-xl h-9 font-semibold border-none"
            style={{
              background: "linear-gradient(135deg, #10b981, #0d9488)",
              boxShadow: "0 4px 14px rgba(16,185,129,0.4)",
            }}
          >
            {mode === "create" ? "Save Coupon" : "Update Coupon"}
          </Button>
        </div>
      }
    >
      <div className="px-6 pt-5 pb-2">
        <Form form={form} layout="vertical">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Form.Item
              name="code"
              label={<FieldLabel>Coupon Code</FieldLabel>}
              rules={[
                { required: true, message: "Coupon code is required" },
                { min: 3, message: "At least 3 characters" },
                { max: 50, message: "Maximum 50 characters" },
                { pattern: /^[A-Za-z0-9_-]+$/, message: "Letters, numbers, - and _ only" },
              ]}
              getValueFromEvent={(e) => e.target.value.toUpperCase()}
            >
              <Input placeholder="e.g. EID2026" className="rounded-lg h-9.5 uppercase" maxLength={50} />
            </Form.Item>

            <Form.Item
              name="discount_type"
              label={<FieldLabel>Discount Type</FieldLabel>}
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { value: CouponDiscountType.PERCENTAGE, label: "Percentage off" },
                  { value: CouponDiscountType.FIXED_AMOUNT, label: "Fixed amount off" },
                ]}
                className="rounded-lg"
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Form.Item
              name="discount_value"
              label={
                <FieldLabel>
                  {discountType === CouponDiscountType.PERCENTAGE ? "Discount (%)" : "Discount Amount"}
                </FieldLabel>
              }
              rules={[
                { required: true, message: "Discount value is required" },
                {
                  validator: (_, value) =>
                    discountType === CouponDiscountType.PERCENTAGE && value > 100
                      ? Promise.reject(new Error("Cannot exceed 100%"))
                      : Promise.resolve(),
                },
              ]}
            >
              <InputNumber min={0} className="w-full rounded-lg h-9.5" />
            </Form.Item>

            {discountType === CouponDiscountType.PERCENTAGE && (
              <Form.Item
                name="max_discount_amount"
                label={<FieldLabel>Max Discount (Optional)</FieldLabel>}
                tooltip="Caps the discount a percentage coupon can give on a large order. Leave blank for no cap."
              >
                <InputNumber min={0} placeholder="No cap" className="w-full rounded-lg h-9.5" />
              </Form.Item>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Form.Item
              name="min_order_amount"
              label={<FieldLabel>Minimum Order (Optional)</FieldLabel>}
            >
              <InputNumber min={0} placeholder="No minimum" className="w-full rounded-lg h-9.5" />
            </Form.Item>

            <Form.Item
              name="max_uses"
              label={<FieldLabel>Usage Limit (Optional)</FieldLabel>}
              tooltip="Total number of times this coupon can be redeemed across all customers combined. Leave blank for unlimited."
            >
              <InputNumber min={1} placeholder="Unlimited" className="w-full rounded-lg h-9.5" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Form.Item
              name="max_uses_per_customer"
              label={<FieldLabel>Per-Customer Limit (Optional)</FieldLabel>}
              tooltip="How many times one customer can redeem this coupon — e.g. set to 1 for a 'first order' code. Leave blank for no per-customer limit."
            >
              <InputNumber min={1} placeholder="No limit" className="w-full rounded-lg h-9.5" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Form.Item name="starts_at" label={<FieldLabel>Starts (Optional)</FieldLabel>}>
              <DatePicker showTime className="rounded-lg w-full h-9.5" />
            </Form.Item>

            <Form.Item
              name="ends_at"
              label={<FieldLabel>Ends (Optional)</FieldLabel>}
              dependencies={["starts_at"]}
              rules={[
                ({ getFieldValue }) => ({
                  validator: (_, value) => {
                    const starts = getFieldValue("starts_at");
                    if (value && starts && value.valueOf() <= starts.valueOf()) {
                      return Promise.reject(new Error("Must be after the start date"));
                    }
                    return Promise.resolve();
                  },
                }),
              ]}
            >
              <DatePicker showTime className="rounded-lg w-full h-9.5" />
            </Form.Item>
          </div>

          <Form.Item name="is_active" label={<FieldLabel>Active</FieldLabel>} valuePropName="checked" style={{ marginBottom: 0 }}>
            <Switch />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
}

export default memo(CouponFormModal);
