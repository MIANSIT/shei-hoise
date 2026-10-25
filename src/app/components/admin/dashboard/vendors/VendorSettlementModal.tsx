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
  /** What the vendor owes right now: goods not returned + delivery charges − payments. */
  currentDue: number;
  /** Delivery charges billed on this vendor's confirmed dispatches (already inside `currentDue`). */
  deliveryBilled: number;
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
  currentDue,
  deliveryBilled,
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

  // Settling moves stock out of "goods the vendor holds" (valued at its last
  // dispatch price) and sells it at this visit's unit price, so the balance
  // after the visit — before any payment — is what's left to collect,
  // delivery charges included. Without this, a payment that only covers the
  // goods leaves the delivery charge standing as a surprise "due".
  const dueAfterSettling = useMemo(() => {
    const stockOut = rows.reduce(
      (sum, r) => sum + (r.sold_quantity + r.returned_quantity) * (r.last_vendor_tp ?? 0),
      0,
    );
    return currentDue - stockOut + totalReceivable;
  }, [rows, currentDue, totalReceivable]);
  const dueAfterPayment = dueAfterSettling - paymentAmount;
  const round2 = (v: number) => Math.round(v * 100) / 100;

  const columns: ColumnsType<SettlementRow> = [
    {
      title: "Product",
      key: "product",
      render: (_, r) => (
        <div>
          <div className="font-medium text-foreground">{r.product_name}</div>
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
        <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-border">
          <div className="w-8 h-8 rounded-xl bg-linear-to-br from-emerald-400 to-teal-600 flex items-center justify-center shrink-0">
            <HandCoins size={16} color="white" />
          </div>
          <span className="text-base font-bold text-foreground">Record Settlement</span>
        </div>
      }
      footer={
        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          <div className="text-sm font-semibold text-foreground">
            Still due after this payment:{" "}
            <span className={dueAfterPayment > 0.005 ? "text-rose-600" : "text-emerald-600"}>
              {Math.max(dueAfterPayment, 0).toFixed(2)}
            </span>
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
            <label className="text-xs font-semibold text-muted-foreground">Settlement Date</label>
            <DatePicker format="DD-MM-YYYY"
              value={settlementDate}
              onChange={(d) => d && setSettlementDate(d)}
              className="w-full mt-1 rounded-lg"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Amount Received</label>
            <InputNumber
              min={0}
              value={paymentAmount}
              onChange={(v) => setPaymentAmount(v ?? 0)}
              className="w-full mt-1 rounded-lg"
            />
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setPaymentAmount(round2(totalReceivable))}
                disabled={totalReceivable <= 0}
                className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                Sold items only
              </button>
              <button
                type="button"
                onClick={() => setPaymentAmount(round2(Math.max(dueAfterSettling, 0)))}
                disabled={dueAfterSettling <= 0}
                className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              >
                Everything due
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Payment Method</label>
            <Select
              value={paymentMethod}
              onChange={setPaymentMethod}
              options={PAYMENT_METHOD_OPTIONS}
              disabled={paymentAmount <= 0}
              className="w-full mt-1"
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sold this visit</span>
            <span className="font-medium tabular-nums">{totalReceivable.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Vendor owes after this visit</span>
            <span className="font-semibold tabular-nums">{Math.max(dueAfterSettling, 0).toFixed(2)}</span>
          </div>
          {deliveryBilled > 0 && (
            <p className="m-0 text-[11px] text-muted-foreground">
              Includes {deliveryBilled.toFixed(2)} delivery charge billed on dispatches. It is part of what the
              vendor owes, so a payment of only the sold items leaves it due — use &ldquo;Everything due&rdquo; to
              collect it too.
            </p>
          )}
          {paymentAmount > dueAfterSettling + 0.005 && dueAfterSettling >= 0 && (
            <p className="m-0 text-[11px] text-amber-600">
              This is more than the vendor owes — the extra becomes a credit on their account.
            </p>
          )}
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
          <label className="text-xs font-semibold text-muted-foreground">Notes (Optional)</label>
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
