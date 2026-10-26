"use client";

import { useEffect, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import { DatePicker, Empty, Input, InputNumber, Modal, Popconfirm, Select, Spin } from "antd";
import { Trash2 } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useBranches } from "@/lib/context/BranchContext";
import type { SupplierEntryKind, SupplierLedgerEntry } from "@/lib/queries/supplier/supplierTypes";

const PAY_METHODS = ["cash", "mobile_banking", "card", "bank_transfer", "online", "other"] as const;

export interface SupplierEntryValues {
  amount: number;
  date: string;
  paymentMethod: string;
  /** Payments only: the shop's own money, or an investor / the owner's pocket. */
  paidFrom: "shop" | "outside";
  /** Payments from the shop's money in a store with branches. */
  branchId: string | null;
  note: string;
}

interface SupplierEntryModalProps {
  open: boolean;
  kind: SupplierEntryKind;
  supplierName: string;
  /** Starting amount, e.g. the total of a reorder list. */
  defaultAmount?: number | null;
  saving: boolean;
  onSubmit: (values: SupplierEntryValues) => void;
  onCancel: () => void;
}

/** Add a bill (goods bought, adds to what is owed) or record a payment (money paid out). */
export function SupplierEntryModal({
  open,
  kind,
  supplierName,
  defaultAmount = null,
  saving,
  onSubmit,
  onCancel,
}: SupplierEntryModalProps) {
  const t = useTranslation();
  const { enabled: branchesOn, activeBranches, workBranchId } = useBranches();
  const [amount, setAmount] = useState<number | null>(null);
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [method, setMethod] = useState<string>("cash");
  const [paidFrom, setPaidFrom] = useState<"shop" | "outside">("shop");
  const [branchId, setBranchId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setAmount(defaultAmount);
      setDate(dayjs());
      setMethod("cash");
      setPaidFrom("shop");
      setBranchId(workBranchId ?? activeBranches[0]?.id ?? null);
      setNote("");
    }
    // The branch is only a starting value; it shouldn't reset while the form is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultAmount]);

  const needsBranch = kind === "payment" && paidFrom === "shop" && branchesOn;

  const methodLabel: Record<string, string> = {
    cash: t.admin.moCash,
    mobile_banking: t.admin.moMobileBanking,
    card: t.admin.moCard,
    bank_transfer: t.admin.moBankTransfer,
    online: t.admin.moOnline,
    other: t.admin.moOther,
  };

  return (
    <Modal
      open={open}
      onCancel={saving ? undefined : onCancel}
      onOk={() =>
        amount &&
        amount > 0 &&
        onSubmit({
          amount,
          date: date.format("YYYY-MM-DD"),
          paymentMethod: method,
          paidFrom: kind === "payment" ? paidFrom : "shop",
          branchId: needsBranch ? branchId : null,
          note,
        })
      }
      okText={t.admin.spSave}
      cancelText={t.admin.spCancel}
      confirmLoading={saving}
      okButtonProps={{ disabled: !amount || amount <= 0 || (needsBranch && !branchId) }}
      title={`${kind === "bill" ? t.admin.slBillTitle : t.admin.slPaymentTitle} — ${supplierName}`}
      destroyOnHidden
    >
      <p className="text-xs text-muted-foreground mt-0 mb-4">
        {kind === "bill" ? t.admin.slBillHint : t.admin.slPaymentHint}
      </p>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground">{t.admin.moAmount}</label>
          <InputNumber min={0} value={amount} onChange={(v) => setAmount(v === null ? null : Number(v))} className="w-full mt-1" autoFocus />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">{t.admin.moDate}</label>
            <DatePicker
              format="DD-MM-YYYY"
              value={date}
              onChange={(d) => d && setDate(d)}
              allowClear={false}
              disabledDate={(d) => d.isAfter(dayjs(), "day")}
              className="w-full mt-1"
            />
          </div>
          {kind === "payment" && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground">{t.admin.slMethod}</label>
              <Select
                value={method}
                onChange={setMethod}
                className="w-full mt-1"
                options={PAY_METHODS.map((m) => ({ value: m, label: methodLabel[m] }))}
              />
            </div>
          )}
        </div>
        {kind === "payment" && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground">{t.admin.moPaidFrom}</label>
            <Select
              value={paidFrom}
              onChange={setPaidFrom}
              className="w-full mt-1"
              options={[
                { value: "shop", label: t.admin.moPaidFromShop },
                { value: "outside", label: t.admin.moPaidFromOutside },
              ]}
            />
            <p className="m-0 mt-1 text-[11px] text-muted-foreground">{t.admin.moPaidFromHint}</p>
          </div>
        )}
        {needsBranch && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground">{t.admin.moBranch}</label>
            <Select
              value={branchId ?? undefined}
              onChange={setBranchId}
              className="w-full mt-1"
              placeholder={t.admin.moChooseBranch}
              options={activeBranches.map((b) => ({ value: b.id, label: b.name }))}
            />
          </div>
        )}
        <div>
          <label className="text-xs font-semibold text-muted-foreground">{t.admin.moNote}</label>
          <Input.TextArea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={300} className="mt-1" />
        </div>
      </div>
    </Modal>
  );
}

interface SupplierLedgerModalProps {
  open: boolean;
  supplierName: string;
  entries: SupplierLedgerEntry[];
  loading: boolean;
  money: (amount: number) => string;
  onDelete: (entryId: string) => void;
  onClose: () => void;
}

/** Every bill and payment for one supplier, newest first, with a way to remove a mistake. */
export function SupplierLedgerModal({ open, supplierName, entries, loading, money, onDelete, onClose }: SupplierLedgerModalProps) {
  const t = useTranslation();
  return (
    <Modal open={open} onCancel={onClose} footer={null} title={`${t.admin.slLedger} — ${supplierName}`} destroyOnHidden width={560}>
      {loading ? (
        <div className="flex justify-center py-8">
          <Spin />
        </div>
      ) : entries.length === 0 ? (
        <Empty description={t.admin.slEmptyLedger} />
      ) : (
        <ul className="m-0 p-0 list-none divide-y divide-border max-h-[60vh] overflow-y-auto">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">
                  {entry.kind === "bill" ? t.admin.slBill : t.admin.slPayment}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">{dayjs(entry.date).format("DD-MM-YYYY")}</span>
                </div>
                {entry.note && <div className="text-[11px] text-muted-foreground break-words">{entry.note}</div>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-sm font-bold tabular-nums ${
                    entry.kind === "bill" ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {entry.kind === "bill" ? "+" : "−"}
                  {money(entry.amount)}
                </span>
                <Popconfirm
                  title={t.admin.slDeleteEntryConfirm}
                  okText={t.admin.spDelete}
                  cancelText={t.admin.spCancel}
                  onConfirm={() => onDelete(entry.id)}
                >
                  <button
                    type="button"
                    aria-label={t.admin.spDelete}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-muted transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </Popconfirm>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
