"use client";

import { InputNumber, Select } from "antd";
import { Trash2 } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";
import { FunderPicker } from "@/app/components/admin/dashboard/financial/FunderPicker";
import type { FunderValue } from "@/lib/queries/financial/moneyPartnerTypes";

/** The money methods offered when paying a supplier: Bank includes card, mobile banking is bKash and Nagad together. */
export const SUPPLIER_PAY_METHODS = ["cash", "mobile_banking", "bank_transfer"] as const;

/** One part of a payment that is split over several: how much, from whose money, by which method. */
export interface PaymentLineValue {
  amount: number | null;
  method: string;
  paidFrom: "shop" | "outside";
  /** Stores with branches: the branch whose money paid this part (shop money only). */
  branchId: string | null;
  /** Stores with branches: the branch whose bills this part pays. */
  billBranchId: string | null;
  /** Money from outside: who paid, and how it counts. */
  funder: FunderValue;
}

export const emptyPaymentLine = (branchId: string | null): PaymentLineValue => ({
  amount: null,
  method: "cash",
  paidFrom: "shop",
  branchId,
  billBranchId: branchId,
  funder: { partnerId: null, treatment: "capital" },
});

interface SupplierPaymentLineFieldsProps {
  value: PaymentLineValue;
  onChange: (value: PaymentLineValue) => void;
  onRemove: () => void;
  /** 1-based position, shown in the heading. */
  index: number;
  branchesOn: boolean;
  branches: { id: string; name: string }[];
  /** "Whose money was used?" only exists on plans with investor money; without it every part comes from the shop. */
  investorAllowed: boolean;
  /** Show "pays bills of branch". Off on Receive Stock, where every part pays the bill of the branch that received the goods. */
  showBillBranch?: boolean;
}

/**
 * One extra line of a split payment, e.g. "৳3,000 from Niketon's bKash" or "৳3,000 from an investor".
 * The first part of a payment is the main form; each line added here is saved as its own payment, with its own
 * branch, method and who paid, so every balance goes down by exactly its part.
 */
export function SupplierPaymentLineFields({ value, onChange, onRemove, index, branchesOn, branches, investorAllowed, showBillBranch = true }: SupplierPaymentLineFieldsProps) {
  const t = useTranslation();
  const methodLabel: Record<string, string> = {
    cash: t.admin.moCash,
    mobile_banking: t.admin.moMobileBanking,
    bank_transfer: t.admin.moBankTransfer,
  };
  const set = (patch: Partial<PaymentLineValue>) => onChange({ ...value, ...patch });
  const fromShop = !investorAllowed || value.paidFrom === "shop";

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="m-0 text-xs font-bold text-foreground">{t.admin.splPartTitle.replace("{n}", String(index))}</p>
        <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-rose-600" aria-label={t.admin.splRemove}>
          <Trash2 size={15} />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-muted-foreground">{t.admin.moAmount}</label>
          <InputNumber min={0} precision={2} value={value.amount} onChange={(v) => set({ amount: v === null ? null : Number(v) })} style={{ width: "100%" }} className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground">{t.admin.slMethod}</label>
          <Select value={value.method} onChange={(v) => set({ method: v })} className="w-full mt-1" options={SUPPLIER_PAY_METHODS.map((m) => ({ value: m, label: methodLabel[m] }))} />
        </div>
      </div>
      {investorAllowed && (
        <div>
          <label className="text-xs font-semibold text-muted-foreground">{t.admin.moPaidFrom}</label>
          <Select
            value={value.paidFrom}
            onChange={(v: "shop" | "outside") => set({ paidFrom: v })}
            className="w-full mt-1"
            options={[
              { value: "shop", label: t.admin.moPaidFromShop },
              { value: "outside", label: t.admin.moPaidFromOutside },
            ]}
          />
        </div>
      )}
      {investorAllowed && value.paidFrom === "outside" && <FunderPicker value={value.funder} onChange={(funder) => set({ funder })} />}
      {branchesOn && fromShop && (
        <div>
          <label className="text-xs font-semibold text-muted-foreground">{t.admin.rcPaidBranch}</label>
          <Select
            value={value.branchId ?? undefined}
            onChange={(v) => set({ branchId: v })}
            className="w-full mt-1"
            placeholder={t.admin.moChooseBranch}
            options={branches.map((b) => ({ value: b.id, label: b.name }))}
          />
        </div>
      )}
      {branchesOn && showBillBranch && (
        <div>
          <label className="text-xs font-semibold text-muted-foreground">{t.admin.splBillBranch}</label>
          <Select
            value={value.billBranchId ?? undefined}
            onChange={(v) => set({ billBranchId: v })}
            className="w-full mt-1"
            placeholder={t.admin.moChooseBranch}
            options={branches.map((b) => ({ value: b.id, label: b.name }))}
          />
        </div>
      )}
    </div>
  );
}
