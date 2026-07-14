"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { Modal, Button, DatePicker, InputNumber, Input, Table, Select } from "antd";
import { HandCoins } from "lucide-react";
import type { ColumnsType } from "antd/es/table";
import dayjs, { Dayjs } from "dayjs";
import type {
  VendorStockRow,
  VendorSettlementItemInput,
  VendorPaymentMethod,
} from "@/lib/types/vendor/type";

const PAYMENT_METHOD_OPTIONS: { value: VendorPaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "cod", label: "Cash on Delivery" },
  { value: "mobile_banking", label: "Mobile Banking (bKash/Nagad/Rocket)" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "online", label: "Online" },
];

interface SettlementRow extends VendorStockRow {
  sold_quantity: number;
  returned_quantity: number;
  unit_price: number;
}

interface VendorSettlementModalProps {
  open: boolean;
  stock: VendorStockRow[];
  submitting: boolean;
  onSubmit: (payload: {
    settlementDate: string;
    items: VendorSettlementItemInput[];
    paymentAmount: number;
    paymentMethod: VendorPaymentMethod;
    notes?: string;
  }) => void;
  onCancel: () => void;
}

function VendorSettlementModal({
  open,
  stock,
  submitting,
  onSubmit,
  onCancel,
}: VendorSettlementModalProps) {
  const [settlementDate, setSettlementDate] = useState<Dayjs>(dayjs());
  const [rows, setRows] = useState<SettlementRow[]>([]);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<VendorPaymentMethod>("cash");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setRows(
        stock.map((s) => ({
          ...s,
          sold_quantity: 0,
          returned_quantity: 0,
          unit_price: s.last_vendor_tp ?? 0,
        })),
      );
      setSettlementDate(dayjs());
      setPaymentAmount(0);
      setPaymentMethod("cash");
      setNotes("");
    }
  }, [open, stock]);

  const updateRow = (id: string, patch: Partial<SettlementRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const totalReceivable = useMemo(
    () => rows.reduce((sum, r) => sum + r.sold_quantity * r.unit_price, 0),
    [rows],
  );

  const columns: ColumnsType<SettlementRow> = [
    {
      title: "Product",
      key: "product",
      render: (_, r) => (
        <div>
          <div className="font-medium text-gray-800 dark:text-gray-100">{r.product_name}</div>
          <div className="text-xs text-gray-400">Vendor has: {r.quantity_available}</div>
        </div>
      ),
    },
    {
      title: "Sold Qty",
      key: "sold",
      width: 110,
      render: (_, r) => (
        <InputNumber
          min={0}
          max={r.quantity_available - r.returned_quantity}
          value={r.sold_quantity}
          onChange={(v) => updateRow(r.id, { sold_quantity: v ?? 0 })}
          className="w-full rounded-lg"
        />
      ),
    },
    {
      title: "Returned Qty",
      key: "returned",
      width: 120,
      render: (_, r) => (
        <InputNumber
          min={0}
          max={r.quantity_available - r.sold_quantity}
          value={r.returned_quantity}
          onChange={(v) => updateRow(r.id, { returned_quantity: v ?? 0 })}
          className="w-full rounded-lg"
        />
      ),
    },
    {
      title: "Unit Price",
      key: "unit_price",
      width: 110,
      render: (_, r) => (
        <InputNumber
          min={0}
          value={r.unit_price}
          onChange={(v) => updateRow(r.id, { unit_price: v ?? 0 })}
          className="w-full rounded-lg"
        />
      ),
    },
    {
      title: "Receivable",
      key: "receivable",
      width: 100,
      render: (_, r) => (r.sold_quantity * r.unit_price).toFixed(2),
    },
  ];

  const handleOk = () => {
    const items: VendorSettlementItemInput[] = rows
      .filter((r) => r.sold_quantity > 0 || r.returned_quantity > 0)
      .map((r) => ({
        product_id: r.product_id,
        variant_id: r.variant_id,
        sold_quantity: r.sold_quantity,
        returned_quantity: r.returned_quantity,
        unit_price: r.unit_price,
      }));
    onSubmit({
      settlementDate: settlementDate.format("YYYY-MM-DD"),
      items,
      paymentAmount,
      paymentMethod,
      notes: notes || undefined,
    });
  };

  return (
    <Modal
      open={open}
      onCancel={submitting ? undefined : onCancel}
      width={760}
      maskClosable={!submitting}
      closable={!submitting}
      styles={{ body: { borderRadius: 20, padding: 0 } }}
      title={
        <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="w-8 h-8 rounded-xl bg-linear-to-br from-emerald-400 to-teal-600 flex items-center justify-center shrink-0">
            <HandCoins size={16} color="white" />
          </div>
          <span className="text-base font-bold text-gray-900 dark:text-white">Record Settlement</span>
        </div>
      }
      footer={
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-700">
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Total Receivable: {totalReceivable.toFixed(2)}
          </div>
          <div className="flex gap-2">
            <Button className="rounded-xl h-9 font-medium" onClick={onCancel} disabled={submitting}>
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
              Save Settlement
            </Button>
          </div>
        </div>
      }
    >
      <div className="px-6 pt-5 pb-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Settlement Date</label>
            <DatePicker
              value={settlementDate}
              onChange={(d) => d && setSettlementDate(d)}
              className="w-full mt-1 rounded-lg"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Amount Received</label>
            <InputNumber
              min={0}
              value={paymentAmount}
              onChange={(v) => setPaymentAmount(v ?? 0)}
              className="w-full mt-1 rounded-lg"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Payment Method</label>
            <Select
              value={paymentMethod}
              onChange={setPaymentMethod}
              options={PAYMENT_METHOD_OPTIONS}
              disabled={paymentAmount <= 0}
              className="w-full mt-1"
            />
          </div>
        </div>

        <Table
          columns={columns}
          dataSource={rows}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: "This vendor has no stock to settle" }}
          scroll={{ x: 620, y: 300 }}
        />

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

export default memo(VendorSettlementModal);
