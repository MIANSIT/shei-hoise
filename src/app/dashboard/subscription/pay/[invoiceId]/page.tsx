"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Input, Button, Skeleton, message } from "antd";
import {
  ArrowLeft,
  AlertTriangle,
  Copy,
  CheckCheck,
  Smartphone,
  Landmark,
  Send,
  CheckCircle2,
} from "lucide-react";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import {
  getInvoiceById,
  type SubscriptionInvoice,
} from "@/lib/queries/subscription/getStoreSubscription";
import { BKASH, NAGAD, BANK, calcBkash, calcNagad } from "@/lib/constants/paymentMethods";

// ── Helpers ───────────────────────────────────────────────────────────────────

type MethodType = "bkash" | "nagad" | "bank";

const PAYABLE = new Set(["unpaid", "overdue"]);

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyBtn({ text, label }: { text: string; label?: string }) {
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
      {label ?? (copied ? "Copied" : "Copy")}
    </button>
  );
}

// ── Radio dot ─────────────────────────────────────────────────────────────────

function RadioDot({ selected, color }: { selected: boolean; color: string }) {
  return (
    <div
      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
        selected ? `border-${color}-500 bg-${color}-500` : "border-gray-300 dark:border-gray-600"
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
}: {
  selected: boolean;
  onSelect: () => void;
  amount: number;
}) {
  const { priyo, regular } = calcBkash(amount);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={`rounded-xl border-2 transition-all duration-200 overflow-hidden cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-pink-400 ${
        selected
          ? "border-pink-400 dark:border-pink-500 shadow-lg shadow-pink-100 dark:shadow-pink-900/20"
          : "border-gray-200 dark:border-gray-700 hover:border-pink-300 dark:hover:border-pink-600"
      }`}
    >
      {/* Card header */}
      <div
        className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${
          selected
            ? "bg-pink-50 dark:bg-pink-950/40"
            : "bg-gray-50 dark:bg-gray-800/60"
        }`}
      >
        <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center shrink-0">
          <Smartphone className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">bKash</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">Personal · {BKASH.number}</p>
        </div>
        <RadioDot selected={selected} color="pink" />
      </div>

      {/* Expanded */}
      {selected && (
        <div onClick={(e) => e.stopPropagation()} className="px-4 pt-4 pb-5 bg-white dark:bg-gray-900 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
              <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1.5">
                ★ Priyo — Send Exactly
              </p>
              <p className="text-2xl font-bold text-pink-600 dark:text-pink-400 font-mono leading-none">
                ৳{priyo.toLocaleString("en-BD")}
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                +৳{(priyo - amount).toLocaleString("en-BD")} charge (1.49%)
              </p>
            </div>
            <div className="rounded-lg bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800 p-3">
              <p className="text-[10px] font-bold text-pink-500 dark:text-pink-400 uppercase tracking-wide mb-1.5">
                Regular — Send Exactly
              </p>
              <p className="text-2xl font-bold text-pink-600 dark:text-pink-400 font-mono leading-none">
                ৳{regular.toLocaleString("en-BD")}
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                +৳{(regular - amount).toLocaleString("en-BD")} charge (1.85%)
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2.5">
            <div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">Send to</p>
              <p className="text-sm font-bold font-mono text-gray-800 dark:text-gray-200">{BKASH.number}</p>
            </div>
            <CopyBtn text={BKASH.number} />
          </div>

          <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">
            bKash app → Send Money → enter number → enter the exact amount shown → use invoice number as reference.
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
}: {
  selected: boolean;
  onSelect: () => void;
  amount: number;
}) {
  const total = calcNagad(amount);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={`rounded-xl border-2 transition-all duration-200 overflow-hidden cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
        selected
          ? "border-orange-400 dark:border-orange-500 shadow-lg shadow-orange-100 dark:shadow-orange-900/20"
          : "border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600"
      }`}
    >
      <div
        className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${
          selected
            ? "bg-orange-50 dark:bg-orange-950/40"
            : "bg-gray-50 dark:bg-gray-800/60"
        }`}
      >
        <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
          <Smartphone className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Nagad</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">Personal · {NAGAD.number}</p>
        </div>
        <RadioDot selected={selected} color="orange" />
      </div>

      {selected && (
        <div onClick={(e) => e.stopPropagation()} className="px-4 pt-4 pb-5 bg-white dark:bg-gray-900 space-y-3">
          <div className="rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 p-4">
            <p className="text-[10px] font-bold text-orange-500 dark:text-orange-400 uppercase tracking-wide mb-1.5">
              Send Exactly
            </p>
            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 font-mono leading-none">
              ৳{total.toLocaleString("en-BD")}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">
              ৳{amount.toLocaleString("en-BD")} + ৳{(total - amount).toLocaleString("en-BD")} charge (1.3%)
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2.5">
            <div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">Send to</p>
              <p className="text-sm font-bold font-mono text-gray-800 dark:text-gray-200">{NAGAD.number}</p>
            </div>
            <CopyBtn text={NAGAD.number} />
          </div>

          <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">
            Nagad app → Send Money → enter number → enter the exact amount shown → use invoice number as reference.
          </p>
        </div>
      )}
    </div>
  );
}

function BankCard({ selected, onSelect }: { selected: boolean; onSelect: () => void }) {
  const rows = [
    { label: "Bank", value: BANK.bankName },
    { label: "Account Name", value: BANK.accountName },
    { label: "Account No.", value: BANK.accountNumber },
    { label: "Branch", value: BANK.branch },
    { label: "Routing No.", value: BANK.routingNumber },
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
          : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
      }`}
    >
      <div
        className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${
          selected
            ? "bg-blue-50 dark:bg-blue-950/40"
            : "bg-gray-50 dark:bg-gray-800/60"
        }`}
      >
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
          <Landmark className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Bank Transfer</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">NRBC Bank · Rajshahi</p>
        </div>
        <RadioDot selected={selected} color="blue" />
      </div>

      {selected && (
        <div onClick={(e) => e.stopPropagation()} className="px-4 pt-4 pb-5 bg-white dark:bg-gray-900 space-y-1">
          {rows.map(({ label, value }) => (
            <div
              key={label}
              className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              <span className="text-[11px] text-gray-400 dark:text-gray-500 w-28 shrink-0">{label}</span>
              <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                <span className="text-[13px] font-semibold font-mono text-gray-800 dark:text-gray-200 truncate">
                  {value}
                </span>
                <CopyBtn text={value} />
              </div>
            </div>
          ))}
          <p className="text-[11px] text-gray-400 dark:text-gray-500 pt-2 leading-relaxed">
            Transfer the exact amount and email the receipt with your invoice number.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PayInvoicePage() {
  const router = useRouter();
  const params = useParams<{ invoiceId: string }>();
  const { storeId, loading: userLoading } = useCurrentUser();

  const [invoice, setInvoice] = useState<SubscriptionInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [method, setMethod] = useState<MethodType | null>(null);
  const [reference, setReference] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (userLoading || !storeId || !params.invoiceId) return;

    setLoading(true);
    getInvoiceById(params.invoiceId, storeId)
      .then((inv) => {
        if (!inv) { setNotFound(true); return; }
        setInvoice(inv);
      })
      .finally(() => setLoading(false));
  }, [storeId, userLoading, params.invoiceId]);

  async function handleSubmit() {
    if (!method) return message.warning("Select a payment method.");
    if (!reference.trim()) return message.warning("Enter your transaction reference.");
    if (!senderNumber.trim()) return message.warning("Enter your sender number.");
    if (!storeId || !invoice) return;

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
          sender_number: senderNumber.trim(),
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      setDone(true);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading ──

  if (userLoading || loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 py-8 px-4">
        <Skeleton active paragraph={{ rows: 2 }} />
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  if (notFound || !invoice) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <p className="text-gray-500 dark:text-gray-400 text-sm">Invoice not found.</p>
        <button
          type="button"
          onClick={() => router.push("/dashboard/subscription")}
          className="mt-4 text-violet-600 dark:text-violet-400 text-sm font-medium hover:underline"
        >
          ← Back to Subscription
        </button>
      </div>
    );
  }

  if (!PAYABLE.has(invoice.status)) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-2">
        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
        <p className="text-gray-800 dark:text-gray-200 font-semibold">
          Invoice {invoice.invoice_number} is already {invoice.status}.
        </p>
        <button
          type="button"
          onClick={() => router.push("/dashboard/subscription")}
          className="mt-2 text-violet-600 dark:text-violet-400 text-sm font-medium hover:underline"
        >
          ← Back to Subscription
        </button>
      </div>
    );
  }

  // ── Success ──

  if (done) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-3 px-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Payment Submitted</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
          We received your payment details for{" "}
          <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">
            {invoice.invoice_number}
          </span>
          . We will verify and update your invoice within 1–2 business days.
        </p>
        <button
          type="button"
          onClick={() => router.push("/dashboard/subscription")}
          className="mt-4 inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
        >
          Back to Subscription
        </button>
      </div>
    );
  }

  // ── Main ──

  return (
    <div className="max-w-2xl mx-auto pb-12">
      {/* Back link */}
      <button
        type="button"
        onClick={() => router.push("/dashboard/subscription")}
        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Subscription
      </button>

      {/* Invoice summary card */}
      <div className="rounded-2xl bg-linear-to-br from-violet-700 to-violet-900 dark:from-violet-800 dark:to-violet-950 px-6 pt-6 pb-7 mb-5 shadow-xl shadow-violet-200 dark:shadow-violet-900/30">
        <p className="text-xs font-semibold text-violet-300 uppercase tracking-widest mb-2">
          Invoice Payment
        </p>
        <p className="text-4xl font-bold text-white font-mono tracking-tight">
          ৳{Number(invoice.amount).toLocaleString("en-BD")}
        </p>
        <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
          <span className="text-sm text-violet-200 font-mono">{invoice.invoice_number}</span>
          <span className="text-xs text-violet-300 bg-violet-800/50 border border-violet-600/50 px-2.5 py-1 rounded-full">
            {invoice.billing_cycle === "yearly" ? "Yearly" : "Monthly"} · {invoice.plan_name}
          </span>
        </div>
        {invoice.due_date && (
          <p className="text-xs text-violet-400 mt-2">Due {fmt(invoice.due_date)}</p>
        )}
      </div>

      {/* Reference warning */}
      <div className="flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3.5 mb-5">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-[12px] text-amber-700 dark:text-amber-300 leading-relaxed">
          Always use{" "}
          <span className="font-mono font-bold bg-amber-100 dark:bg-amber-900/50 border border-amber-300 dark:border-amber-700 px-1.5 py-0.5 rounded text-amber-800 dark:text-amber-200">
            {invoice.invoice_number}
          </span>{" "}
          as the payment reference / note so we can match your payment.
        </div>
      </div>

      {/* Method cards */}
      <div>
        <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
          Choose Payment Method
        </p>
        <div className="space-y-3">
          <BkashCard
            selected={method === "bkash"}
            onSelect={() => setMethod(method === "bkash" ? null : "bkash")}
            amount={invoice.amount}
          />
          <NagadCard
            selected={method === "nagad"}
            onSelect={() => setMethod(method === "nagad" ? null : "nagad")}
            amount={invoice.amount}
          />
          <BankCard
            selected={method === "bank"}
            onSelect={() => setMethod(method === "bank" ? null : "bank")}
          />
        </div>
      </div>

      {/* Reference form — appears after method selected */}
      {method && (
        <div className="mt-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-4">
          <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            Confirm Your Payment
          </p>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
              Transaction ID / Reference <span className="text-red-400">*</span>
            </label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. 8N7A6B2XQP"
              size="large"
              className="font-mono"
            />
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              The transaction ID from your payment receipt.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
              Sender Number <span className="text-red-400">*</span>
            </label>
            <Input
              value={senderNumber}
              onChange={(e) => setSenderNumber(e.target.value)}
              placeholder="Phone / account number you paid from"
              className="font-mono"
            />
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              The bKash / Nagad / bank account number you sent from.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
              Notes <span className="text-gray-300 dark:text-gray-600 font-normal">(optional)</span>
            </label>
            <Input.TextArea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any other details about the payment..."
              rows={2}
              className="resize-none"
            />
          </div>
        </div>
      )}

      {/* Submit */}
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/dashboard/subscription")}
          className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          Cancel
        </button>
        <Button
          type="primary"
          size="large"
          icon={<Send className="w-4 h-4" />}
          loading={submitting}
          disabled={!method || !reference.trim() || !senderNumber.trim()}
          onClick={handleSubmit}
          style={{
            backgroundColor: "#7c3aed",
            borderColor: "#7c3aed",
            borderRadius: 12,
            paddingInline: 28,
            fontWeight: 600,
            height: 44,
          }}
        >
          Submit Payment
        </Button>
      </div>
    </div>
  );
}
