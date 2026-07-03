"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Skeleton, message } from "antd";
import { ArrowLeft, AlertTriangle, Send, CheckCircle2 } from "lucide-react";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useTranslation } from "@/lib/hook/useTranslation";
import {
  getInvoiceById,
  type SubscriptionInvoice,
} from "@/lib/queries/subscription/getStoreSubscription";
import { PaymentMethodPicker, type MethodType } from "@/components/subscription/PaymentMethodPicker";
import { PaymentDetailsForm } from "@/components/subscription/PaymentDetailsForm";

const PAYABLE = new Set(["unpaid", "overdue"]);

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function PayInvoicePage() {
  const router = useRouter();
  const t = useTranslation();
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
    if (!method) return message.warning(t.admin.subWarnSelectMethod);
    if (!reference.trim()) return message.warning(t.admin.subWarnEnterReference);
    if (!senderNumber.trim()) return message.warning(t.admin.subWarnEnterSender);
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
      if (!res.ok) throw new Error(data.error || t.admin.subErrSubmissionFailed);

      setDone(true);
    } catch (err) {
      message.error(err instanceof Error ? err.message : t.admin.subErrGeneric);
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
        <p className="text-gray-500 dark:text-gray-400 text-sm">{t.admin.subInvoiceNotFound}</p>
        <button
          type="button"
          onClick={() => router.push("/dashboard/subscription")}
          className="mt-4 text-violet-600 dark:text-violet-400 text-sm font-medium hover:underline"
        >
          ← {t.admin.subBackToSubscription}
        </button>
      </div>
    );
  }

  if (!PAYABLE.has(invoice.status)) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-2">
        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
        <p className="text-gray-800 dark:text-gray-200 font-semibold">
          {t.admin.subColInvoiceNum} {invoice.invoice_number} {t.admin.subInvoiceAlreadyStatus} {invoice.status}.
        </p>
        <button
          type="button"
          onClick={() => router.push("/dashboard/subscription")}
          className="mt-2 text-violet-600 dark:text-violet-400 text-sm font-medium hover:underline"
        >
          ← {t.admin.subBackToSubscription}
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
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t.admin.subPaymentSubmittedTitle}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
          {t.admin.subPaymentSubmittedPrefix}{" "}
          <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">
            {invoice.invoice_number}
          </span>
          . {t.admin.subPaymentSubmittedUpdateSuffix}
        </p>
        <button
          type="button"
          onClick={() => router.push("/dashboard/subscription")}
          className="mt-4 inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
        >
          {t.admin.subBackToSubscription}
        </button>
      </div>
    );
  }

  // ── Main ──

  return (
    <div className="max-w-2xl mx-auto px-4 pb-12">
      {/* Back link */}
      <button
        type="button"
        onClick={() => router.push("/dashboard/subscription")}
        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.admin.subBackToSubscription}
      </button>

      {/* Invoice summary card */}
      <div className="rounded-2xl bg-linear-to-br from-violet-700 to-violet-900 dark:from-violet-800 dark:to-violet-950 px-6 pt-6 pb-7 mb-5 shadow-xl shadow-violet-200 dark:shadow-violet-900/30">
        <p className="text-xs font-semibold text-violet-300 uppercase tracking-widest mb-2">
          {t.admin.subInvoicePaymentTitle}
        </p>
        <p className="text-4xl font-bold text-white font-mono tracking-tight">
          ৳{Number(invoice.amount).toLocaleString("en-BD")}
        </p>
        <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
          <span className="text-sm text-violet-200 font-mono">{invoice.invoice_number}</span>
          <span className="text-xs text-violet-300 bg-violet-800/50 border border-violet-600/50 px-2.5 py-1 rounded-full">
            {invoice.billing_cycle === "yearly" ? t.admin.subCycleYearly : t.admin.subCycleMonthly} · {invoice.plan_name}
          </span>
        </div>
        {invoice.due_date && (
          <p className="text-xs text-violet-400 mt-2">{t.admin.subDuePrefix} {fmt(invoice.due_date)}</p>
        )}
      </div>

      {/* Reference warning */}
      <div className="flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3.5 mb-5">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-[12px] text-amber-700 dark:text-amber-300 leading-relaxed">
          {t.admin.subAlwaysUsePrefix}{" "}
          <span className="font-mono font-bold bg-amber-100 dark:bg-amber-900/50 border border-amber-300 dark:border-amber-700 px-1.5 py-0.5 rounded text-amber-800 dark:text-amber-200">
            {invoice.invoice_number}
          </span>{" "}
          {t.admin.subAlwaysUseSuffix}
        </div>
      </div>

      {/* Method cards */}
      <div>
        <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
          {t.admin.subChoosePaymentMethod}
        </p>
        <PaymentMethodPicker method={method} onMethodChange={setMethod} amount={invoice.amount} invoiceNumber={invoice.invoice_number} />
      </div>

      {/* Reference form — appears after method selected */}
      {method && (
        <div className="mt-5">
          <PaymentDetailsForm
            reference={reference}
            onReferenceChange={setReference}
            senderNumber={senderNumber}
            onSenderNumberChange={setSenderNumber}
            notes={notes}
            onNotesChange={setNotes}
          />
        </div>
      )}

      {/* Submit */}
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/dashboard/subscription")}
          className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          {t.admin.subBtnCancel}
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
          {t.admin.subSubmitPayment}
        </Button>
      </div>
    </div>
  );
}
