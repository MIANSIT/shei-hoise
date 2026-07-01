"use client";

import { useState } from "react";
import { Modal, Input, Button, message } from "antd";
import { Copy, CheckCheck, AlertTriangle, Landmark, Smartphone, Send } from "lucide-react";
import { BKASH, NAGAD, BANK, calcBkash, calcNagad } from "@/lib/constants/paymentMethods";
import type { SubscriptionInvoice } from "@/lib/queries/subscription/getStoreSubscription";

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 text-[11px] font-medium text-violet-500 hover:text-violet-700 transition-colors"
    >
      {copied ? <CheckCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ── Payment method cards ──────────────────────────────────────────────────────

type MethodType = "bkash" | "nagad" | "bank";

interface MethodCardProps {
  type: MethodType;
  selected: boolean;
  onSelect: () => void;
  amount: number;
}

function BkashCard({ selected, onSelect, amount }: Omit<MethodCardProps, "type">) {
  const { priyo, regular } = calcBkash(amount);
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-xl border-2 transition-all duration-200 overflow-hidden ${
        selected
          ? "border-pink-400 shadow-md shadow-pink-100"
          : "border-gray-200 hover:border-pink-200"
      }`}
    >
      {/* Header */}
      <div className={`flex items-center gap-2.5 px-4 py-3 ${selected ? "bg-pink-50" : "bg-gray-50"}`}>
        <div className="w-7 h-7 rounded-full bg-pink-500 flex items-center justify-center shrink-0">
          <Smartphone className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">bKash</p>
          <p className="text-[11px] text-gray-500">Personal · {BKASH.number}</p>
        </div>
        <div className={`w-4 h-4 rounded-full border-2 transition-colors ${selected ? "border-pink-500 bg-pink-500" : "border-gray-300"}`}>
          {selected && <div className="w-full h-full rounded-full bg-white scale-[0.45] block" />}
        </div>
      </div>

      {/* Expanded amounts */}
      {selected && (
        <div className="px-4 pb-4 pt-3 bg-white">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">★ Priyo</p>
              <p className="text-xl font-bold text-pink-600 font-mono">৳{priyo.toLocaleString("en-BD")}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">+৳{(priyo - amount).toLocaleString("en-BD")} (1.49%)</p>
            </div>
            <div className="rounded-lg bg-pink-50 border border-pink-200 p-3">
              <p className="text-[10px] font-semibold text-pink-500 uppercase tracking-wide mb-1">Regular</p>
              <p className="text-xl font-bold text-pink-600 font-mono">৳{regular.toLocaleString("en-BD")}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">+৳{(regular - amount).toLocaleString("en-BD")} (1.85%)</p>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Send to</p>
              <p className="text-sm font-bold font-mono text-gray-800">{BKASH.number}</p>
            </div>
            <CopyBtn text={BKASH.number} />
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            bKash app → Send Money → enter number → enter exact amount → use invoice number as reference.
          </p>
        </div>
      )}
    </button>
  );
}

function NagadCard({ selected, onSelect, amount }: Omit<MethodCardProps, "type">) {
  const total = calcNagad(amount);
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-xl border-2 transition-all duration-200 overflow-hidden ${
        selected
          ? "border-orange-400 shadow-md shadow-orange-100"
          : "border-gray-200 hover:border-orange-200"
      }`}
    >
      <div className={`flex items-center gap-2.5 px-4 py-3 ${selected ? "bg-orange-50" : "bg-gray-50"}`}>
        <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
          <Smartphone className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">Nagad</p>
          <p className="text-[11px] text-gray-500">Personal · {NAGAD.number}</p>
        </div>
        <div className={`w-4 h-4 rounded-full border-2 transition-colors ${selected ? "border-orange-500 bg-orange-500" : "border-gray-300"}`}>
          {selected && <div className="w-full h-full rounded-full bg-white scale-[0.45] block" />}
        </div>
      </div>

      {selected && (
        <div className="px-4 pb-4 pt-3 bg-white">
          <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 mb-3">
            <p className="text-[10px] font-semibold text-orange-500 uppercase tracking-wide mb-1">Send Exactly</p>
            <p className="text-2xl font-bold text-orange-600 font-mono">৳{total.toLocaleString("en-BD")}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">৳{amount.toLocaleString("en-BD")} + ৳{(total - amount).toLocaleString("en-BD")} charge (1.3%)</p>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Send to</p>
              <p className="text-sm font-bold font-mono text-gray-800">{NAGAD.number}</p>
            </div>
            <CopyBtn text={NAGAD.number} />
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Nagad app → Send Money → enter number → enter exact amount → use invoice number as reference.
          </p>
        </div>
      )}
    </button>
  );
}

function BankCard({ selected, onSelect }: Omit<MethodCardProps, "type" | "amount">) {
  const rows = [
    { label: "Bank", value: BANK.bankName },
    { label: "Account Name", value: BANK.accountName },
    { label: "Account No.", value: BANK.accountNumber },
    { label: "Branch", value: BANK.branch },
    { label: "Routing No.", value: BANK.routingNumber },
  ];
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-xl border-2 transition-all duration-200 overflow-hidden ${
        selected
          ? "border-blue-400 shadow-md shadow-blue-100"
          : "border-gray-200 hover:border-blue-200"
      }`}
    >
      <div className={`flex items-center gap-2.5 px-4 py-3 ${selected ? "bg-blue-50" : "bg-gray-50"}`}>
        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
          <Landmark className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">Bank Transfer</p>
          <p className="text-[11px] text-gray-500">NRBC Bank · Rajshahi</p>
        </div>
        <div className={`w-4 h-4 rounded-full border-2 transition-colors ${selected ? "border-blue-500 bg-blue-500" : "border-gray-300"}`}>
          {selected && <div className="w-full h-full rounded-full bg-white scale-[0.45] block" />}
        </div>
      </div>

      {selected && (
        <div className="px-4 pb-4 pt-3 bg-white space-y-2">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
              <span className="text-[11px] text-gray-400 w-28 shrink-0">{label}</span>
              <div className="flex items-center gap-2 flex-1 justify-end">
                <span className="text-[13px] font-semibold font-mono text-gray-800 truncate">{value}</span>
                <CopyBtn text={value} />
              </div>
            </div>
          ))}
          <p className="text-[11px] text-gray-400 pt-1">
            Transfer the exact amount and email the receipt with your invoice number.
          </p>
        </div>
      )}
    </button>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

interface PayNowModalProps {
  open: boolean;
  invoice: SubscriptionInvoice;
  storeId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function PayNowModal({ open, invoice, storeId, onClose, onSuccess }: PayNowModalProps) {
  const [method, setMethod] = useState<MethodType | null>(null);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const amount = invoice.amount;
  const dueDate = invoice.due_date
    ? new Date(invoice.due_date).toLocaleDateString("en-BD", { year: "numeric", month: "long", day: "numeric" })
    : null;

  function reset() {
    setMethod(null);
    setReference("");
    setNotes("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (!method) return message.warning("Select a payment method.");
    if (!reference.trim()) return message.warning("Enter your transaction reference.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/subscription/submit-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: storeId,
          invoice_id: invoice.id,
          payment_method: method,
          payment_reference: reference.trim(),
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      message.success("Payment submitted — we'll verify and update your invoice shortly.");
      reset();
      onSuccess();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      title={null}
      width={520}
      destroyOnHidden
      styles={{ body: { padding: 0 } }}
    >
      {/* ── Dark header ── */}
      <div className="rounded-t-lg bg-gradient-to-br from-violet-700 to-violet-900 px-6 pt-6 pb-5">
        <p className="text-xs font-semibold text-violet-300 uppercase tracking-widest mb-1">Invoice Payment</p>
        <p className="text-3xl font-bold text-white font-mono tracking-tight">
          ৳{amount.toLocaleString("en-BD")}
        </p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-sm text-violet-300 font-mono">{invoice.invoice_number}</p>
          {dueDate && <p className="text-xs text-violet-400">Due {dueDate}</p>}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
        {/* Reference notice */}
        <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 border border-amber-200 px-3.5 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[12px] text-amber-700 leading-relaxed">
            Always use{" "}
            <span className="font-mono font-bold bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded text-amber-800">
              {invoice.invoice_number}
            </span>{" "}
            as the payment note so we can match your payment.
          </p>
        </div>

        {/* Method selector */}
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Choose Payment Method
          </p>
          <div className="space-y-2.5">
            <BkashCard selected={method === "bkash"} onSelect={() => setMethod(method === "bkash" ? null : "bkash")} amount={amount} />
            <NagadCard selected={method === "nagad"} onSelect={() => setMethod(method === "nagad" ? null : "nagad")} amount={amount} />
            <BankCard selected={method === "bank"} onSelect={() => setMethod(method === "bank" ? null : "bank")} />
          </div>
        </div>

        {/* Reference + notes (only shown once a method is selected) */}
        {method && (
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
                Transaction ID / Reference <span className="text-red-400">*</span>
              </label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. 8N7A6B2XQP"
                size="large"
                className="font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
                Notes <span className="text-gray-300">(optional)</span>
              </label>
              <Input.TextArea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any details about the payment..."
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="px-6 pb-6 flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
        <button onClick={handleClose} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          Cancel
        </button>
        <Button
          type="primary"
          size="large"
          icon={<Send className="w-4 h-4" />}
          loading={submitting}
          disabled={!method || !reference.trim()}
          onClick={handleSubmit}
          style={{
            backgroundColor: "#7c3aed",
            borderColor: "#7c3aed",
            borderRadius: 10,
            paddingInline: 28,
            fontWeight: 600,
          }}
        >
          Submit Payment
        </Button>
      </div>
    </Modal>
  );
}
