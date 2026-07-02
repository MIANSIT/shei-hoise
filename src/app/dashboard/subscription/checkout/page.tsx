"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Skeleton, message } from "antd";
import { ArrowLeft, AlertTriangle, Send, CheckCircle2, CheckCircle } from "lucide-react";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { getPlanById, parseFeatures, parseLimits, type PublicPlan } from "@/lib/queries/subscription/getPublicPlans";
import { getStoreSubscription } from "@/lib/queries/subscription/getStoreSubscription";
import { PaymentMethodPicker, type MethodType } from "@/components/subscription/PaymentMethodPicker";
import { PaymentDetailsForm } from "@/components/subscription/PaymentDetailsForm";
import { generateInvoiceNumber } from "@/lib/utils/generateInvoiceNumber";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { storeId, loading: userLoading } = useCurrentUser();

  const planId = searchParams.get("plan");
  const cycle = searchParams.get("cycle") === "yearly" ? "yearly" : "monthly";

  const [invoiceNumber] = useState(() => generateInvoiceNumber());
  const [plan, setPlan] = useState<PublicPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [method, setMethod] = useState<MethodType | null>(null);
  const [reference, setReference] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedInvoiceNumber, setSubmittedInvoiceNumber] = useState<string | null>(null);

  useEffect(() => {
    if (!planId) { setNotFound(true); setLoading(false); return; }
    if (userLoading) return;

    setLoading(true);

    async function load() {
      const p = await getPlanById(planId!);
      if (!p) { setNotFound(true); return; }

      if (!p.is_public) {
        const sub = storeId ? await getStoreSubscription(storeId) : null;
        if (sub?.plan_id !== p.id) { setNotFound(true); return; }
      }

      setPlan(p);
    }

    load().finally(() => setLoading(false));
  }, [planId, storeId, userLoading]);

  const amount = plan ? (cycle === "yearly" ? plan.price_yearly : plan.price_monthly) : 0;
  const currency = plan?.currency.trim() ?? "";
  const features = plan ? [...parseFeatures(plan.features), ...parseLimits(plan.limits)] : [];

  async function handleSubmit() {
    if (!method) return message.warning("Select a payment method.");
    if (!reference.trim()) return message.warning("Enter your transaction reference.");
    if (!senderNumber.trim()) return message.warning("Enter your sender number.");
    if (!storeId || !plan) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/subscription/select-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: plan.id,
          billing_cycle: cycle,
          invoice_number: invoiceNumber,
          payment: {
            method,
            reference: reference.trim(),
            sender_number: senderNumber.trim(),
            notes: notes.trim() || undefined,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && data.invoiceId) {
          message.warning(data.error);
          router.push(`/dashboard/subscription/pay/${data.invoiceId}`);
          return;
        }
        throw new Error(data.error || "Submission failed");
      }

      setSubmittedInvoiceNumber(data.invoiceNumber ?? invoiceNumber);
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
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  if (notFound || !plan) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <p className="text-gray-500 dark:text-gray-400 text-sm">Plan not found.</p>
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

  // ── Success ──

  if (submittedInvoiceNumber) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-3 px-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Payment Submitted</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
          We received your payment details for{" "}
          <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">
            {submittedInvoiceNumber}
          </span>
          . We will verify and activate your {plan.name} subscription within 1–2 business days.
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

      {/* Plan summary card */}
      <div className="rounded-2xl bg-linear-to-br from-violet-700 to-violet-900 dark:from-violet-800 dark:to-violet-950 px-6 pt-6 pb-7 mb-5 shadow-xl shadow-violet-200 dark:shadow-violet-900/30">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-xs font-semibold text-violet-300 uppercase tracking-widest">
            Subscribe to {plan.name}
          </p>
          <span className="text-xs text-violet-300 bg-violet-800/50 border border-violet-600/50 px-2.5 py-1 rounded-full shrink-0">
            {cycle === "yearly" ? "Yearly" : "Monthly"}
          </span>
        </div>
        <p className="text-4xl font-bold text-white font-mono tracking-tight">
          {currency}{amount.toLocaleString("en-BD")}
          <span className="text-base font-normal text-violet-300">/{cycle === "yearly" ? "year" : "month"}</span>
        </p>
        {plan.description && (
          <p className="text-sm text-violet-200 mt-2">{plan.description}</p>
        )}

        {features.length > 0 && (
          <ul className="mt-4 pt-4 border-t border-violet-600/40 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-violet-100">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Reference number */}
      <div className="flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3.5 mb-5">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-[12px] text-amber-700 dark:text-amber-300 leading-relaxed">
          Always use{" "}
          <span className="font-mono font-bold bg-amber-100 dark:bg-amber-900/50 border border-amber-300 dark:border-amber-700 px-1.5 py-0.5 rounded text-amber-800 dark:text-amber-200">
            {invoiceNumber}
          </span>{" "}
          as the payment reference / note so we can match your payment.
        </div>
      </div>

      {/* Method cards */}
      <div>
        <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
          Choose Payment Method
        </p>
        <PaymentMethodPicker method={method} onMethodChange={setMethod} amount={amount} />
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
          Confirm & Submit Payment
        </Button>
      </div>
    </div>
  );
}

export default function SubscriptionCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto space-y-4 py-8 px-4">
          <Skeleton active paragraph={{ rows: 2 }} />
          <Skeleton active paragraph={{ rows: 8 }} />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
