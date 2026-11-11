"use client";

import { useEffect, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import { Button, DatePicker, Empty, Input, InputNumber, Modal, Popconfirm, Select, Spin } from "antd";
import { Trash2 } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useBranches } from "@/lib/context/BranchContext";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useFeatureGate } from "@/lib/hook/useFeatureGate";
import type { SupplierEntryKind, SupplierLedgerEntry } from "@/lib/queries/supplier/supplierTypes";
import { FunderPicker } from "@/app/components/admin/dashboard/financial/FunderPicker";
import type { FunderValue } from "@/lib/queries/financial/moneyPartnerTypes";
import { emptyPaymentLine, SupplierPaymentLineFields, type PaymentLineValue } from "./SupplierPaymentLineFields";

const PAY_METHODS = ["cash", "mobile_banking", "bank_transfer"] as const;

export interface SupplierEntryValues {
  amount: number;
  date: string;
  paymentMethod: string;
  /** Payments only: the shop's own money, or an investor / the owner's pocket. */
  paidFrom: "shop" | "outside";
  /** Payments from the shop's money in a store with branches: the branch whose money paid. A bill: the branch that received the goods. */
  branchId: string | null;
  /** Payments in a store with branches: the branch whose bills it pays. */
  billBranchId: string | null;
  /** Payments from outside: who paid, and whether it counts as their capital or a loan to repay. */
  funderId: string | null;
  funderTreatment: "capital" | "loan" | null;
  /** Payments: the bill it pays first; null = the supplier's oldest bills. */
  forBillId: string | null;
  note: string;
}

/** A bill a payment can be made for. */
export interface PayableBillOption {
  id: string;
  label: string;
  date: string;
  left: number;
}

interface SupplierEntryModalProps {
  open: boolean;
  kind: SupplierEntryKind;
  supplierName: string;
  /** Starting amount, e.g. the total of a reorder list. */
  defaultAmount?: number | null;
  /** The branch whose bills a payment pays first, e.g. the branch of the bill being paid. */
  defaultBillBranchId?: string | null;
  /** Payments: the supplier's open bills, to pay one of them by name. Empty = no choice is shown. */
  billOptions?: PayableBillOption[];
  /** The bill picked when the form opens, e.g. the bill whose Pay button was pressed. */
  defaultForBillId?: string | null;
  /** Shows an amount as money, for the bill list. */
  money?: (amount: number) => string;
  saving: boolean;
  onSubmit: (values: SupplierEntryValues) => void;
  /** A payment can be split over several parts (branches, methods, an investor): given, it is called with every part instead of onSubmit. */
  onSubmitMany?: (values: SupplierEntryValues[]) => void;
  onCancel: () => void;
}

/** Add a bill (goods bought, adds to what is owed) or record a payment (money paid out). */
export function SupplierEntryModal({
  open,
  kind,
  supplierName,
  defaultAmount = null,
  defaultBillBranchId = null,
  billOptions = [],
  defaultForBillId = null,
  money,
  saving,
  onSubmit,
  onSubmitMany,
  onCancel,
}: SupplierEntryModalProps) {
  const t = useTranslation();
  const { enabled: branchesOn, activeBranches, workBranchId } = useBranches();
  // "Whose money was used?" only exists on plans with investor_money; without it a payment comes from the shop.
  const { storeId } = useCurrentUser();
  const { allowed: investorAllowed } = useFeatureGate(storeId, "investor_money");
  const [amount, setAmount] = useState<number | null>(null);
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [method, setMethod] = useState<string>("cash");
  const [paidFrom, setPaidFrom] = useState<"shop" | "outside">("shop");
  const [funder, setFunder] = useState<FunderValue>({ partnerId: null, treatment: "capital" });
  const [branchId, setBranchId] = useState<string | null>(null);
  // The branch whose bills the payment pays: follows the branch whose money paid until it is changed.
  const [billBranchId, setBillBranchId] = useState<string | null>(null);
  const [billBranchTouched, setBillBranchTouched] = useState(false);
  const [note, setNote] = useState("");
  // The bill this payment pays first (optional).
  const [forBillId, setForBillId] = useState<string | null>(null);
  // More parts of the same payment, each from its own branch, method or investor.
  const [extraLines, setExtraLines] = useState<PaymentLineValue[]>([]);

  useEffect(() => {
    if (open) {
      setExtraLines([]);
      setAmount(defaultAmount);
      setDate(dayjs());
      setMethod("cash");
      setPaidFrom("shop");
      setFunder({ partnerId: null, treatment: "capital" });
      const startBranch = workBranchId ?? activeBranches[0]?.id ?? null;
      setBranchId(startBranch);
      setBillBranchId(defaultBillBranchId ?? startBranch);
      setBillBranchTouched(!!defaultBillBranchId);
      setNote("");
      setForBillId(defaultForBillId);
    }
    // The branch is only a starting value; it shouldn't reset while the form is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultAmount, defaultBillBranchId, defaultForBillId]);

  const needsBranch = kind === "payment" && (!investorAllowed || paidFrom === "shop") && branchesOn;
  // A bill typed by hand also says which branch received the goods.
  const needsBillGoodsBranch = kind === "bill" && branchesOn;

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
      onOk={() => {
        if (!amount || amount <= 0) return;
        const first: SupplierEntryValues = {
          amount,
          date: date.format("YYYY-MM-DD"),
          paymentMethod: method,
          paidFrom: kind === "payment" && investorAllowed ? paidFrom : "shop",
          branchId: needsBranch || needsBillGoodsBranch ? branchId : null,
          billBranchId: kind === "payment" && branchesOn ? billBranchId : null,
          funderId: kind === "payment" && investorAllowed && paidFrom === "outside" ? funder.partnerId : null,
          funderTreatment: kind === "payment" && investorAllowed && paidFrom === "outside" && funder.partnerId ? funder.treatment : null,
          forBillId: kind === "payment" ? forBillId : null,
          note,
        };
        if (kind === "payment" && onSubmitMany && extraLines.length > 0) {
          onSubmitMany([
            first,
            ...extraLines.map((l) => ({
              amount: l.amount ?? 0,
              date: first.date,
              paymentMethod: l.method,
              paidFrom: investorAllowed ? l.paidFrom : ("shop" as const),
              branchId: branchesOn && (!investorAllowed || l.paidFrom === "shop") ? l.branchId : null,
              billBranchId: branchesOn ? l.billBranchId : null,
              funderId: investorAllowed && l.paidFrom === "outside" ? l.funder.partnerId : null,
              funderTreatment: investorAllowed && l.paidFrom === "outside" && l.funder.partnerId ? l.funder.treatment : null,
              forBillId: null,
              note,
            })),
          ]);
        } else {
          onSubmit(first);
        }
      }}
      okText={t.admin.spSave}
      cancelText={t.admin.spCancel}
      confirmLoading={saving}
      okButtonProps={{
        disabled:
          !amount ||
          amount <= 0 ||
          (needsBranch && !branchId) ||
          (needsBillGoodsBranch && !branchId) ||
          (kind === "payment" && branchesOn && !billBranchId) ||
          extraLines.some(
            (l) =>
              !l.amount ||
              l.amount <= 0 ||
              (branchesOn && (!investorAllowed || l.paidFrom === "shop") && !l.branchId) ||
              (branchesOn && !l.billBranchId),
          ),
      }}
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
        {kind === "payment" && billOptions.length > 0 && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground">{t.admin.spForBill}</label>
            <Select
              allowClear
              value={forBillId ?? undefined}
              onChange={(v) => setForBillId(v ?? null)}
              className="w-full mt-1"
              placeholder={t.admin.spForBillAny}
              options={billOptions.map((b) => ({
                value: b.id,
                label: `${b.label} · ${dayjs(b.date).format("DD-MM-YYYY")} · ${t.admin.spForBillLeft} ${money ? money(b.left) : b.left}`,
              }))}
            />
            <p className="m-0 mt-1 text-[11px] text-muted-foreground">{t.admin.spForBillHint}</p>
          </div>
        )}
        {kind === "payment" && investorAllowed && (
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
        {kind === "payment" && investorAllowed && paidFrom === "outside" && <FunderPicker value={funder} onChange={setFunder} amount={amount} />}
        {needsBillGoodsBranch && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground">{t.admin.rcBranch}</label>
            <Select
              value={branchId ?? undefined}
              onChange={setBranchId}
              className="w-full mt-1"
              placeholder={t.admin.rcBranchPh}
              options={activeBranches.map((b) => ({ value: b.id, label: b.name }))}
            />
          </div>
        )}
        {needsBranch && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground">{t.admin.moBranch}</label>
            <Select
              value={branchId ?? undefined}
              onChange={(v) => {
                setBranchId(v);
                if (!billBranchTouched) setBillBranchId(v);
              }}
              className="w-full mt-1"
              placeholder={t.admin.moChooseBranch}
              options={activeBranches.map((b) => ({ value: b.id, label: b.name }))}
            />
          </div>
        )}
        {kind === "payment" && branchesOn && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground">{t.admin.splBillBranch}</label>
            <Select
              value={billBranchId ?? undefined}
              onChange={(v) => {
                setBillBranchId(v);
                setBillBranchTouched(true);
              }}
              className="w-full mt-1"
              placeholder={t.admin.moChooseBranch}
              options={activeBranches.map((b) => ({ value: b.id, label: b.name }))}
            />
            <p className="m-0 mt-1 text-[11px] text-muted-foreground">{t.admin.splBillBranchHint}</p>
          </div>
        )}
        {kind === "payment" && onSubmitMany && (
          <div className="space-y-3">
            {extraLines.map((line, i) => (
              <SupplierPaymentLineFields
                key={i}
                index={i + 2}
                value={line}
                onChange={(v) => setExtraLines((prev) => prev.map((x, j) => (j === i ? v : x)))}
                onRemove={() => setExtraLines((prev) => prev.filter((_, j) => j !== i))}
                branchesOn={branchesOn}
                branches={activeBranches}
                investorAllowed={investorAllowed}
              />
            ))}
            <Button onClick={() => setExtraLines((prev) => [...prev, emptyPaymentLine(workBranchId ?? activeBranches[0]?.id ?? null)])}>{t.admin.splAddPart}</Button>
            {extraLines.length > 0 && <p className="m-0 text-[11px] text-muted-foreground">{t.admin.splHint}</p>}
            {extraLines.length > 0 && (
              <p className="m-0 text-sm font-semibold text-foreground">
                {t.admin.splTotal}: {Math.round(((amount ?? 0) + extraLines.reduce((sum, l) => sum + (l.amount ?? 0), 0)) * 100) / 100}
              </p>
            )}
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
  const { branches } = useBranches();
  const branchNames = new Map(branches.map((b) => [b.id, b.name]));
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
                  {entry.kind === "bill" ? t.admin.slBill : entry.kind === "credit" ? t.admin.slCredit : t.admin.slPayment}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {dayjs(entry.date).format("DD-MM-YYYY")}
                    {entry.kind === "payment" && entry.branchId ? ` · ${branchNames.get(entry.branchId) ?? ""}` : ""}
                  </span>
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
