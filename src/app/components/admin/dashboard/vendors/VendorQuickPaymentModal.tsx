"use client";

import { memo, useEffect, useState } from "react";
import { Modal, Button, DatePicker, InputNumber, Input, Select } from "antd";
import { Wallet } from "lucide-react";
import dayjs, { Dayjs } from "dayjs";
import type { VendorPaymentMethod } from "@/lib/types/vendor/type";

const PAYMENT_METHOD_OPTIONS: { value: VendorPaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "cod", label: "Cash on Delivery" },
  { value: "mobile_banking", label: "Mobile Banking (bKash/Nagad/Rocket)" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "online", label: "Online" },
];

export interface VendorInvoiceOption {
  order_id: string;
  invoice_number: string;
  due_remaining: number;
}

interface VendorQuickPaymentModalProps {
  open: boolean;
  submitting: boolean;
  invoiceOptions?: VendorInvoiceOption[];
  onSubmit: (payload: {
    paymentDate: string;
    amount: number;
    paymentMethod: VendorPaymentMethod;
    notes?: string;
    vendorOrderId?: string | null;
  }) => void;
  onCancel: () => void;
}

function VendorQuickPaymentModal({
  open,
  submitting,
  invoiceOptions = [],
  onSubmit,
  onCancel,
}: VendorQuickPaymentModalProps) {
  const [paymentDate, setPaymentDate] = useState<Dayjs>(dayjs());
  const [amount, setAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<VendorPaymentMethod>("cash");
  const [notes, setNotes] = useState("");
  const [vendorOrderId, setVendorOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPaymentDate(dayjs());
      setAmount(0);
      setPaymentMethod("cash");
      setNotes("");
      setVendorOrderId(null);
    }
  }, [open]);

  const handleOk = () => {
    onSubmit({
      paymentDate: paymentDate.format("YYYY-MM-DD"),
      amount,
      paymentMethod,
      notes: notes || undefined,
      vendorOrderId,
    });
  };

  return (
    <Modal
      open={open}
      onCancel={submitting ? undefined : onCancel}
      width={440}
      maskClosable={!submitting}
      closable={!submitting}
      styles={{ body: { borderRadius: 20, padding: 0 } }}
      title={
        <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="w-8 h-8 rounded-xl bg-linear-to-br from-sky-400 to-blue-600 flex items-center justify-center shrink-0">
            <Wallet size={16} color="white" />
          </div>
          <span className="text-base font-bold text-gray-900 dark:text-white">Record Payment</span>
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
          <Button className="rounded-xl h-9 font-medium" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="primary"
            loading={submitting}
            disabled={!(amount > 0)}
            onClick={handleOk}
            className="rounded-xl h-9 font-semibold border-none"
            style={{
              background: "linear-gradient(135deg, #38bdf8, #2563eb)",
              boxShadow: "0 4px 14px rgba(37,99,235,0.4)",
            }}
          >
            Save Payment
          </Button>
        </div>
      }
    >
      <div className="px-6 pt-5 pb-4 space-y-4">
        <p className="text-xs text-gray-400 dark:text-gray-500 -mt-1">
          Log cash collected from this vendor without reconciling which products sold — use
          &quot;Record Settlement&quot; when you&apos;re ready to do that.
        </p>
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Payment Date</label>
          <DatePicker
            value={paymentDate}
            onChange={(d) => d && setPaymentDate(d)}
            className="w-full mt-1 rounded-lg"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Amount Received</label>
          <InputNumber
            min={0}
            autoFocus
            value={amount}
            onChange={(v) => setAmount(v ?? 0)}
            className="w-full mt-1 rounded-lg"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Payment Method</label>
          <Select
            value={paymentMethod}
            onChange={setPaymentMethod}
            options={PAYMENT_METHOD_OPTIONS}
            className="w-full mt-1"
          />
        </div>
        {invoiceOptions.length > 0 && (
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Apply To Invoice (Optional)
            </label>
            <Select
              allowClear
              placeholder="Auto — oldest unpaid invoice first"
              value={vendorOrderId ?? undefined}
              onChange={(v) => setVendorOrderId(v ?? null)}
              options={invoiceOptions.map((o) => ({
                value: o.order_id,
                label: `${o.invoice_number} — Due: ${o.due_remaining.toFixed(2)}`,
              }))}
              className="w-full mt-1"
            />
          </div>
        )}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Notes (Optional)</label>
          <Input.TextArea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 rounded-lg"
          />
        </div>
      </div>
    </Modal>
  );
}

export default memo(VendorQuickPaymentModal);
