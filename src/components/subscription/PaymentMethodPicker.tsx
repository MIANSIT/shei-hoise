"use client";

import { useState } from "react";
import { Copy, CheckCheck, Smartphone, Landmark } from "lucide-react";
import { BKASH, NAGAD, BANK } from "@/lib/constants/paymentMethods";
import { useTranslation } from "@/lib/hook/useTranslation";

export type MethodType = "bkash" | "nagad" | "bank";

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyBtn({ text, label }: { text: string; label?: string }) {
  const t = useTranslation();
  const [copied, setCopied] = useState(false);
  function copy(e: React.MouseEvent) {
    e.stopPropagation(); // prevent bubbling to the card toggle
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-500 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 transition-colors shrink-0"
    >
      {copied ? <CheckCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {label ?? (copied ? t.admin.subCopied : t.admin.subCopy)}
    </button>
  );
}

// ── Radio dot ─────────────────────────────────────────────────────────────────

function RadioDot({ selected, color }: { selected: boolean; color: string }) {
  return (
    <div
      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
        selected ? `border-${color}-500 bg-${color}-500` : "border-border"
      }`}
    >
      {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
    </div>
  );
}

// ── Method cards (div, not button — fixes nested-button error) ────────────────

function BkashCard({
  selected,
  onSelect,
  amount,
  invoiceNumber,
}: {
  selected: boolean;
  onSelect: () => void;
  amount: number;
  invoiceNumber: string;
}) {
  const t = useTranslation();
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={`rounded-xl border-2 transition-all duration-200 overflow-hidden cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-pink-400 ${
        selected
          ? "border-pink-400 dark:border-pink-500 shadow-lg shadow-pink-100 dark:shadow-pink-900/20"
          : "border-border hover:border-pink-300 dark:hover:border-pink-600"
      }`}
    >
      <div
        className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${
          selected ? "bg-pink-50 dark:bg-pink-950/40" : "bg-background/60"
        }`}
      >
        <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center shrink-0">
          <Smartphone className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">{t.admin.subMethodBkash}</p>
          <p className="text-[11px] text-muted-foreground">{t.admin.subPersonal} · {BKASH.number}</p>
        </div>
        <RadioDot selected={selected} color="pink" />
      </div>

      {selected && (
        <div onClick={(e) => e.stopPropagation()} className="px-4 pt-4 pb-5 bg-card space-y-3">
          <div className="rounded-lg bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800 p-4">
            <p className="text-[10px] font-bold text-pink-500 dark:text-pink-400 uppercase tracking-wide mb-1.5">
              {t.admin.subSendExactly}
            </p>
            <p className="text-3xl font-bold text-pink-600 dark:text-pink-400 font-mono leading-none">
              ৳{amount.toLocaleString("en-BD")}
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-background border border-border px-3 py-2.5">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t.admin.subSendTo}</p>
              <p className="text-sm font-bold font-mono text-foreground">{BKASH.number}</p>
            </div>
            <CopyBtn text={BKASH.number} />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-background border border-border px-3 py-2.5">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t.admin.subColReference}</p>
              <p className="text-sm font-bold font-mono text-foreground">{invoiceNumber}</p>
            </div>
            <CopyBtn text={invoiceNumber} />
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {t.admin.subBkashInstructions}
          </p>
        </div>
      )}
    </div>
  );
}

function NagadCard({
  selected,
  onSelect,
  amount,
  invoiceNumber,
}: {
  selected: boolean;
  onSelect: () => void;
  amount: number;
  invoiceNumber: string;
}) {
  const t = useTranslation();
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={`rounded-xl border-2 transition-all duration-200 overflow-hidden cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
        selected
          ? "border-orange-400 dark:border-orange-500 shadow-lg shadow-orange-100 dark:shadow-orange-900/20"
          : "border-border hover:border-orange-300 dark:hover:border-orange-600"
      }`}
    >
      <div
        className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${
          selected ? "bg-orange-50 dark:bg-orange-950/40" : "bg-background/60"
        }`}
      >
        <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
          <Smartphone className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">{t.admin.subMethodNagad}</p>
          <p className="text-[11px] text-muted-foreground">{t.admin.subPersonal} · {NAGAD.number}</p>
        </div>
        <RadioDot selected={selected} color="orange" />
      </div>

      {selected && (
        <div onClick={(e) => e.stopPropagation()} className="px-4 pt-4 pb-5 bg-card space-y-3">
          <div className="rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 p-4">
            <p className="text-[10px] font-bold text-orange-500 dark:text-orange-400 uppercase tracking-wide mb-1.5">
              {t.admin.subSendExactly}
            </p>
            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 font-mono leading-none">
              ৳{amount.toLocaleString("en-BD")}
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-background border border-border px-3 py-2.5">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t.admin.subSendTo}</p>
              <p className="text-sm font-bold font-mono text-foreground">{NAGAD.number}</p>
            </div>
            <CopyBtn text={NAGAD.number} />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-background border border-border px-3 py-2.5">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t.admin.subColReference}</p>
              <p className="text-sm font-bold font-mono text-foreground">{invoiceNumber}</p>
            </div>
            <CopyBtn text={invoiceNumber} />
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {t.admin.subNagadInstructions}
          </p>
        </div>
      )}
    </div>
  );
}

function BankCard({
  selected,
  onSelect,
  invoiceNumber,
}: {
  selected: boolean;
  onSelect: () => void;
  invoiceNumber: string;
}) {
  const t = useTranslation();
  const rows = [
    { label: t.admin.subBankRowBank, value: BANK.bankName },
    { label: t.admin.subBankRowAccountName, value: BANK.accountName },
    { label: t.admin.subBankRowAccountNo, value: BANK.accountNumber },
    { label: t.admin.subBankRowBranch, value: BANK.branch },
    { label: t.admin.subBankRowRoutingNo, value: BANK.routingNumber },
    { label: t.admin.subColReference, value: invoiceNumber },
  ];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={`rounded-xl border-2 transition-all duration-200 overflow-hidden cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
        selected
          ? "border-blue-400 dark:border-blue-500 shadow-lg shadow-blue-100 dark:shadow-blue-900/20"
          : "border-border hover:border-blue-300 dark:hover:border-blue-600"
      }`}
    >
      <div
        className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${
          selected ? "bg-blue-50 dark:bg-blue-950/40" : "bg-background/60"
        }`}
      >
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
          <Landmark className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">{t.admin.subMethodBankTransfer}</p>
          <p className="text-[11px] text-muted-foreground">{t.admin.subBankSubLabel}</p>
        </div>
        <RadioDot selected={selected} color="blue" />
      </div>

      {selected && (
        <div onClick={(e) => e.stopPropagation()} className="px-4 pt-4 pb-5 bg-card space-y-1">
          {rows.map(({ label, value }) => (
            <div
              key={label}
              className="flex items-center justify-between py-2 border-b border-border last:border-0"
            >
              <span className="text-[11px] text-muted-foreground w-28 shrink-0">{label}</span>
              <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                <span className="text-[13px] font-semibold font-mono text-foreground truncate">
                  {value}
                </span>
                <CopyBtn text={value} />
              </div>
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground pt-2 leading-relaxed">
            {t.admin.subBankInstructions}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Combined picker ─────────────────────────────────────────────────────────

export function PaymentMethodPicker({
  method,
  onMethodChange,
  amount,
  invoiceNumber,
}: {
  method: MethodType | null;
  onMethodChange: (method: MethodType | null) => void;
  amount: number;
  invoiceNumber: string;
}) {
  return (
    <div className="space-y-3">
      <BkashCard
        selected={method === "bkash"}
        onSelect={() => onMethodChange(method === "bkash" ? null : "bkash")}
        amount={amount}
        invoiceNumber={invoiceNumber}
      />
      <NagadCard
        selected={method === "nagad"}
        onSelect={() => onMethodChange(method === "nagad" ? null : "nagad")}
        amount={amount}
        invoiceNumber={invoiceNumber}
      />
      <BankCard
        selected={method === "bank"}
        onSelect={() => onMethodChange(method === "bank" ? null : "bank")}
        invoiceNumber={invoiceNumber}
      />
    </div>
  );
}
