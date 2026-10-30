"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { Modal, Button, DatePicker, InputNumber, Input, Table, Select, Empty, Spin } from "antd";
import { Undo2 } from "lucide-react";
import type { ColumnsType } from "antd/es/table";
import dayjs, { Dayjs } from "dayjs";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import type {
  VendorPaymentMethod,
  VendorReturnableItem,
  VendorReturnItemInput,
} from "@/lib/types/vendor/type";

const REFUND_METHODS: readonly VendorPaymentMethod[] = ["cash", "mobile_banking", "card", "bank_transfer", "online"];

interface ReturnRow extends VendorReturnableItem {
  quantity: number;
  unit_price: number;
}

interface VendorReturnModalProps {
  open: boolean;
  /** What the vendor bought and can still bring back. */
  items: VendorReturnableItem[];
  loading: boolean;
  submitting: boolean;
  /** What the vendor owes right now (negative = they already have a credit). */
  currentDue: number;
  money: (amount: number) => string;
  onSubmit: (payload: {
    returnDate: string;
    items: VendorReturnItemInput[];
    refundAmount: number;
    refundMethod: VendorPaymentMethod;
    notes?: string;
  }) => void;
  onCancel: () => void;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Goods a vendor brings back after they were already settled as sold: back into stock, credit to the vendor, optional refund. */
function VendorReturnModal({
  open,
  items,
  loading,
  submitting,
  currentDue,
  money,
  onSubmit,
  onCancel,
}: VendorReturnModalProps) {
  const t = useTranslation();
  const n = useLocalNum();
  const [returnDate, setReturnDate] = useState<Dayjs>(dayjs());
  const [rows, setRows] = useState<ReturnRow[]>([]);
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundMethod, setRefundMethod] = useState<VendorPaymentMethod>("cash");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setRows(items.map((i) => ({ ...i, quantity: 0, unit_price: i.last_unit_price })));
      setReturnDate(dayjs());
      setRefundAmount(0);
      setRefundMethod("cash");
      setNotes("");
    }
  }, [open, items]);

  const updateRow = (key: string, patch: Partial<ReturnRow>) => {
    setRows((prev) => prev.map((r) => (rowKey(r) === key ? { ...r, ...patch } : r)));
  };

  const totalCredit = useMemo(() => round2(rows.reduce((sum, r) => sum + r.quantity * r.unit_price, 0)), [rows]);
  // Credit shrinks what the vendor owes; a refund pays part of it back out.
  const dueAfter = round2(currentDue - totalCredit + refundAmount);
  const refundTooBig = refundAmount > totalCredit + 0.005;

  const methodLabel: Record<string, string> = {
    cash: t.admin.moCash,
    mobile_banking: t.admin.moMobileBanking,
    card: t.admin.moCard,
    bank_transfer: t.admin.moBankTransfer,
    online: t.admin.moOnline,
  };

  const columns: ColumnsType<ReturnRow> = [
    {
      title: t.admin.vrColProduct,
      key: "product",
      render: (_, r) => (
        <div>
          <div className="font-medium text-foreground">{r.product_name}</div>
          {r.variant_name && <div className="text-xs text-muted-foreground">{r.variant_name}</div>}
          <div className="text-xs text-gray-400">
            {t.admin.vrColCanReturn}: {n(r.returnable)}
          </div>
        </div>
      ),
    },
    {
      title: t.admin.vrColQty,
      key: "quantity",
      width: 110,
      render: (_, r) => (
        <InputNumber
          min={0}
          max={r.returnable}
          precision={0}
          value={r.quantity}
          onChange={(v) => updateRow(rowKey(r), { quantity: v ?? 0 })}
          className="w-full rounded-lg"
        />
      ),
    },
    {
      title: t.admin.vrColPrice,
      key: "unit_price",
      width: 130,
      render: (_, r) => (
        <InputNumber
          min={0}
          value={r.unit_price}
          onChange={(v) => updateRow(rowKey(r), { unit_price: v ?? 0 })}
          className="w-full rounded-lg"
        />
      ),
    },
    {
      title: t.admin.vrColCredit,
      key: "credit",
      width: 100,
      render: (_, r) => money(round2(r.quantity * r.unit_price)),
    },
  ];

  const canSave = totalCredit > 0 && !refundTooBig && !submitting;

  const handleOk = () => {
    onSubmit({
      returnDate: returnDate.format("YYYY-MM-DD"),
      items: rows
        .filter((r) => r.quantity > 0)
        .map((r) => ({
          product_id: r.product_id,
          variant_id: r.variant_id,
          quantity: r.quantity,
          unit_price: r.unit_price,
        })),
      refundAmount,
      refundMethod,
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
          <div className="w-8 h-8 rounded-xl bg-linear-to-br from-amber-400 to-orange-600 flex items-center justify-center shrink-0">
            <Undo2 size={16} color="white" />
          </div>
          <span className="text-base font-bold text-foreground">{t.admin.vrTitle}</span>
        </div>
      }
      footer={
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border">
          <div className="text-sm font-semibold text-foreground">
            {dueAfter < -0.005 ? t.admin.vrCreditAfter : t.admin.vrOwesAfter}:{" "}
            <span className={dueAfter < -0.005 ? "text-emerald-600" : "text-rose-600"}>{money(Math.abs(dueAfter))}</span>
          </div>
          <div className="flex gap-2">
            <Button className="rounded-xl h-9 font-medium" onClick={onCancel} disabled={submitting}>
              {t.admin.spCancel}
            </Button>
            <Button
              type="primary"
              loading={submitting}
              disabled={!canSave}
              onClick={handleOk}
              className="rounded-xl h-9 font-semibold border-none"
              style={{
                background: "linear-gradient(135deg, #f59e0b, #ea580c)",
                boxShadow: "0 4px 14px rgba(234,88,12,0.35)",
              }}
            >
              {t.admin.vrSave}
            </Button>
          </div>
        </div>
      }
    >
      <div className="px-6 pt-5 pb-4 space-y-4">
        <p className="m-0 text-xs text-muted-foreground">{t.admin.vrIntro}</p>

        {loading ? (
          <div className="flex justify-center py-8">
            <Spin />
          </div>
        ) : rows.length === 0 ? (
          <Empty description={t.admin.vrNothing} />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">{t.admin.moDate}</label>
                <DatePicker
                  format="DD-MM-YYYY"
                  value={returnDate}
                  onChange={(d) => d && setReturnDate(d)}
                  disabledDate={(d) => d.isAfter(dayjs(), "day")}
                  allowClear={false}
                  className="w-full mt-1 rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">{t.admin.vrRefundLabel}</label>
                <InputNumber
                  min={0}
                  max={Math.max(totalCredit, 0)}
                  value={refundAmount}
                  onChange={(v) => setRefundAmount(v ?? 0)}
                  className="w-full mt-1 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setRefundAmount(totalCredit)}
                  disabled={totalCredit <= 0}
                  className="mt-1.5 rounded-full border border-border px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground disabled:opacity-40"
                >
                  {t.admin.vrRefundAll}
                </button>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">{t.admin.vrMethod}</label>
                <Select
                  value={refundMethod}
                  onChange={setRefundMethod}
                  disabled={refundAmount <= 0}
                  options={REFUND_METHODS.map((m) => ({ value: m, label: methodLabel[m] }))}
                  className="w-full mt-1"
                />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.admin.vrCreditTotal}</span>
                <span className="font-semibold tabular-nums">{money(totalCredit)}</span>
              </div>
              <p className="m-0 text-[11px] text-muted-foreground">{t.admin.vrRefundHint}</p>
            </div>

            <Table
              columns={columns}
              dataSource={rows}
              rowKey={rowKey}
              pagination={false}
              scroll={{ x: 560, y: 300 }}
            />

            <div>
              <label className="text-xs font-semibold text-muted-foreground">{t.admin.vrNotes}</label>
              <Input.TextArea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                maxLength={300}
                className="mt-1 rounded-lg"
              />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function rowKey(r: { product_id: string; variant_id: string | null }): string {
  return `${r.product_id}:${r.variant_id ?? ""}`;
}

export default memo(VendorReturnModal);
