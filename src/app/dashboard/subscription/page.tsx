"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Table, Tag, Skeleton, Empty, Button, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CreditCard,
  Calendar,
  Clock,
  Package,
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
  Download,
  Wallet,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Store,
} from "lucide-react";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { downloadInvoicePdf, type StoreInfo } from "@/lib/utils/downloadInvoicePdf";
import { getStoreById } from "@/lib/queries/stores/getStoreById";
import {
  getStoreSubscription,
  getStoreInvoices,
  type StoreSubscription,
  type SubscriptionInvoice,
} from "@/lib/queries/subscription/getStoreSubscription";
import { getPlansForStore } from "@/lib/queries/subscription/getPlansForStore";
import { parseFeatures, type PublicPlan } from "@/lib/queries/subscription/getPublicPlans";
import type { AdminInvoiceRow } from "@/lib/queries/subscription/getAdminInvoices";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatAmount(amount: number, currency: string): string {
  return `${currency.trim()} ${Number(amount).toLocaleString("en-BD", { minimumFractionDigits: 2 })}`;
}

const PAYABLE_STATUSES = new Set(["unpaid", "overdue"]);

// ── Small UI atoms ─────────────────────────────────────────────────────────────

function SubscriptionStatusTag({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    active: { color: "success", label: "Active" },
    trial: { color: "processing", label: "Trial" },
    incomplete: { color: "warning", label: "Incomplete" },
    expired: { color: "default", label: "Expired" },
    cancelled: { color: "error", label: "Cancelled" },
    past_due: { color: "warning", label: "Past Due" },
    pending: { color: "warning", label: "Pending" },
  };
  const cfg = map[status] ?? { color: "default", label: status };
  return <Tag color={cfg.color}>{cfg.label}</Tag>;
}

function InvoiceStatusTag({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    unpaid: { color: "error", label: "Unpaid" },
    submitted: { color: "blue", label: "Submitted" },
    paid: { color: "success", label: "Paid" },
    pending: { color: "warning", label: "Pending" },
    failed: { color: "error", label: "Failed" },
    cancelled: { color: "default", label: "Cancelled" },
    refunded: { color: "purple", label: "Refunded" },
    overdue: { color: "error", label: "Overdue" },
  };
  const cfg = map[status] ?? { color: "default", label: status };
  return <Tag color={cfg.color}>{cfg.label}</Tag>;
}

function BillingCycleTag({ cycle }: { cycle: string }) {
  const label = cycle === "yearly" ? "Yearly" : cycle === "monthly" ? "Monthly" : cycle;
  return <Tag color="blue">{label}</Tag>;
}

// ── PaymentMethodBadge ──────────────────────────────────────────────────────

const METHOD_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  bkash: { bg: "bg-pink-100", text: "text-pink-700", label: "bKash" },
  nagad: { bg: "bg-orange-100", text: "text-orange-700", label: "Nagad" },
  bank: { bg: "bg-blue-100", text: "text-blue-700", label: "Bank Transfer" },
};

function PaymentMethodBadge({ method }: { method: string | null }) {
  if (!method) return <span className="text-gray-400 text-xs">—</span>;
  const style = METHOD_STYLES[method] ?? { bg: "bg-gray-100", text: "text-gray-700", label: method };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

// ── Invoice table ─────────────────────────────────────────────────────────────

function makeInvoiceColumns(
  store: StoreInfo,
  canPay: boolean,
  onPay: (inv: SubscriptionInvoice) => void,
): ColumnsType<SubscriptionInvoice> {
  return [
    {
      title: "Invoice #",
      dataIndex: "invoice_number",
      key: "invoice_number",
      render: (v: string) => (
        <span className="font-mono text-xs font-medium text-gray-700 dark:text-gray-300">
          {v}
        </span>
      ),
    },
    {
      title: "Plan",
      dataIndex: "plan_name",
      key: "plan_name",
    },
    {
      title: "Amount",
      key: "amount",
      render: (_: unknown, record: SubscriptionInvoice) =>
        formatAmount(record.amount, record.currency),
    },
    {
      title: "Billing",
      dataIndex: "billing_cycle",
      key: "billing_cycle",
      render: (v: string) => <BillingCycleTag cycle={v} />,
    },
    {
      title: "Period",
      key: "period",
      render: (_: unknown, record: SubscriptionInvoice) => (
        <span className="text-xs text-gray-500">
          {formatDate(record.period_start)} — {formatDate(record.period_end)}
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (v: string) => <InvoiceStatusTag status={v} />,
    },
    {
      title: "Payment Method",
      dataIndex: "payment_method",
      key: "payment_method",
      render: (v: string | null) => <PaymentMethodBadge method={v} />,
    },
    {
      title: "Paid At",
      dataIndex: "paid_at",
      key: "paid_at",
      render: (v: string | null) => (
        <span className="text-xs">{v ? formatDate(v) : "—"}</span>
      ),
    },
    {
      title: "Reference",
      dataIndex: "payment_reference",
      key: "payment_reference",
      render: (v: string | null) =>
        v ? (
          <span className="font-mono text-xs text-gray-500">{v}</span>
        ) : (
          <span className="text-gray-400 text-xs">—</span>
        ),
    },
    {
      title: "",
      key: "action",
      width: 100,
      render: (_: unknown, record: SubscriptionInvoice) => (
        <div className="flex items-center gap-1">
          {canPay && PAYABLE_STATUSES.has(record.status) && (
            <Tooltip title="Pay Now">
              <Button
                size="small"
                type="primary"
                icon={<Wallet className="w-3 h-3" />}
                onClick={() => onPay(record)}
                style={{ backgroundColor: "#7c3aed", borderColor: "#7c3aed", fontSize: 11 }}
              >
                Pay
              </Button>
            </Tooltip>
          )}
          <Tooltip title="Download PDF">
            <Button
              type="text"
              size="small"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={() => downloadInvoicePdf(record, store)}
            />
          </Tooltip>
        </div>
      ),
    },
  ];
}

// ── SubscriptionCard ──────────────────────────────────────────────────────────

function SubscriptionCard({
  sub,
  latestInvoice,
  store,
  canPay,
  onPay,
}: {
  sub: StoreSubscription;
  latestInvoice: SubscriptionInvoice | null;
  store: StoreInfo;
  canPay: boolean;
  onPay: (inv: SubscriptionInvoice) => void;
}) {
  const infoItems = [
    {
      icon: <Package className="w-4 h-4 text-blue-500" />,
      label: "Plan",
      value: sub.plan?.name ?? "—",
    },
    {
      icon: <CheckCircle className="w-4 h-4 text-emerald-500" />,
      label: "Status",
      value: <SubscriptionStatusTag status={sub.status} />,
    },
    {
      icon: <CreditCard className="w-4 h-4 text-indigo-500" />,
      label: "Payment Status",
      value: latestInvoice ? (
        <InvoiceStatusTag status={latestInvoice.status} />
      ) : (
        <span className="text-gray-400 text-xs">—</span>
      ),
    },
    {
      icon: <RefreshCw className="w-4 h-4 text-violet-500" />,
      label: "Billing Cycle",
      value: <BillingCycleTag cycle={sub.billing_cycle} />,
    },
    {
      icon: <Calendar className="w-4 h-4 text-orange-500" />,
      label: "Started",
      value: formatDate(sub.started_at ?? sub.current_period_start),
    },
    {
      icon: <Calendar className="w-4 h-4 text-red-500" />,
      label: "Expires",
      value: formatDate(sub.expires_at ?? sub.current_period_end),
    },
    ...(sub.trial_ends_at
      ? [
          {
            icon: <Clock className="w-4 h-4 text-amber-500" />,
            label: "Trial Ends",
            value: formatDate(sub.trial_ends_at),
          },
        ]
      : []),
    ...(sub.canceled_at
      ? [
          {
            icon: <XCircle className="w-4 h-4 text-rose-500" />,
            label: "Cancelled At",
            value: formatDate(sub.canceled_at),
          },
        ]
      : []),
    ...(sub.payment_provider
      ? [
          {
            icon: <CreditCard className="w-4 h-4 text-gray-500" />,
            label: "Payment Provider",
            value: (
              <span className="capitalize">{sub.payment_provider.replace(/_/g, " ")}</span>
            ),
          },
        ]
      : []),
  ];

  const showPayBanner =
    canPay && latestInvoice && PAYABLE_STATUSES.has(latestInvoice.status);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
          <CreditCard className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Current Subscription
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {sub.plan?.description ?? "Your active plan details"}
          </p>
        </div>
        {showPayBanner && (
          <Button
            type="primary"
            icon={<Wallet className="w-3.5 h-3.5" />}
            onClick={() => onPay(latestInvoice!)}
            style={{ backgroundColor: "#7c3aed", borderColor: "#7c3aed" }}
          >
            Pay Now
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {infoItems.map((item, i) => (
          <div
            key={i}
            className="flex flex-col gap-1 p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
          >
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium">
              {item.icon}
              {item.label}
            </div>
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {latestInvoice && (
        <div className="mt-5 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
              Latest Invoice
            </span>
            <div className="flex items-center gap-2">
              <InvoiceStatusTag status={latestInvoice.status} />
              <Tooltip title="Download PDF">
                <button
                  onClick={() => downloadInvoicePdf(latestInvoice, store)}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition text-gray-500 dark:text-gray-400"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-200 dark:divide-gray-700">
            <div className="px-4 py-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Invoice #</p>
              <p className="text-sm font-mono font-medium text-gray-800 dark:text-gray-200 truncate">
                {latestInvoice.invoice_number}
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Amount</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {formatAmount(latestInvoice.amount, latestInvoice.currency)}
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                {latestInvoice.paid_at ? "Paid At" : "Due Date"}
              </p>
              <p className="text-sm text-gray-800 dark:text-gray-200">
                {formatDate(latestInvoice.paid_at ?? latestInvoice.due_date)}
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Payment Method</p>
              <PaymentMethodBadge method={latestInvoice.payment_method} />
            </div>
          </div>
        </div>
      )}

      {sub.cancels_at_period_end && (
        <div className="mt-4 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          This subscription will cancel at the end of the current billing period.
        </div>
      )}
    </div>
  );
}

// ── PlansSection ──────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  isCurrent,
  billingCycle,
}: {
  plan: PublicPlan;
  isCurrent: boolean;
  billingCycle: string;
}) {
  const features = parseFeatures(plan.features);
  const isYearly = billingCycle === "yearly";
  const price = isYearly ? plan.price_yearly : plan.price_monthly;
  const perMonth = isYearly ? plan.price_yearly / 12 : plan.price_monthly;
  const currency = plan.currency.trim();

  return (
    <div
      className={`relative rounded-xl border p-5 flex flex-col gap-4 transition-all ${
        isCurrent
          ? "border-violet-400 bg-violet-50 dark:bg-violet-950/30 shadow-md ring-2 ring-violet-300"
          : plan.is_featured
          ? "border-blue-300 bg-blue-50 dark:bg-blue-950/20 shadow-sm"
          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm"
      }`}
    >
      {isCurrent && (
        <div className="absolute -top-3 left-4">
          <span className="bg-violet-600 text-white text-xs font-semibold px-3 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Current Plan
          </span>
        </div>
      )}
      {plan.is_featured && !isCurrent && (
        <div className="absolute -top-3 left-4">
          <span className="bg-blue-500 text-white text-xs font-semibold px-3 py-0.5 rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Featured
          </span>
        </div>
      )}

      <div>
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{plan.name}</h3>
        {plan.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{plan.description}</p>
        )}
      </div>

      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {currency}{price.toLocaleString("en-BD")}
          </span>
          <span className="text-xs text-gray-500">
            /{isYearly ? "year" : "month"}
          </span>
        </div>
        {isYearly && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
            ≈ {currency}{Math.round(perMonth).toLocaleString("en-BD")}/month
          </p>
        )}
        {plan.trial_days > 0 && (
          <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">
            {plan.trial_days} days free trial
          </p>
        )}
      </div>

      {features.length > 0 && (
        <ul className="space-y-1.5">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PlansSection({
  plans,
  currentPlanId,
  billingCycle,
}: {
  plans: PublicPlan[];
  currentPlanId: string | null;
  billingCycle: string;
}) {
  if (plans.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
        <Package className="w-4 h-4 text-gray-500" />
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Subscription Plans
        </h2>
        <span className="ml-auto text-xs text-gray-400">
          {plans.length} plan{plans.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrent={plan.id === currentPlanId}
            billingCycle={billingCycle}
          />
        ))}
      </div>
    </div>
  );
}

// ── Admin payment panel ───────────────────────────────────────────────────────

const METHOD_LABEL: Record<string, string> = {
  bkash: "bKash",
  nagad: "Nagad",
  bank: "Bank",
};
const METHOD_COLOR: Record<string, string> = {
  bkash: "bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300",
  nagad: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  bank: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
};

function AdminPaymentPanel() {
  const [rows, setRows] = useState<AdminInvoiceRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  function loadRows() {
    setLoadingRows(true);
    fetch("/api/subscription/admin-invoices")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setRows(data as AdminInvoiceRow[]))
      .finally(() => setLoadingRows(false));
  }

  useEffect(() => { loadRows(); }, []);

  async function handleAction(invoiceId: string, endpoint: string) {
    setActionId(invoiceId + endpoint);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_id: invoiceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setRows((prev) => prev.filter((r) => r.id !== invoiceId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setActionId(null);
    }
  }

  if (loadingRows) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-6">
        <Skeleton active paragraph={{ rows: 3 }} />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-violet-100 dark:border-violet-800 flex items-center gap-2 bg-violet-50 dark:bg-violet-950/30">
        <ShieldCheck className="w-4 h-4 text-violet-600 dark:text-violet-400" />
        <h2 className="text-base font-semibold text-violet-900 dark:text-violet-100">
          Payment Approvals
        </h2>
        {rows.length > 0 && (
          <span className="ml-1 bg-violet-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {rows.length}
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="py-12 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No pending payments to review.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((row) => (
            <div key={row.id} className="px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Store + invoice info */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    <Store className="w-3.5 h-3.5 text-gray-400" />
                    {row.store_name ?? row.store_id}
                  </div>
                  {row.store_slug && (
                    <span className="text-[11px] text-gray-400 font-mono">@{row.store_slug}</span>
                  )}
                  <InvoiceStatusTag status={row.status} />
                </div>

                <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">
                    {row.invoice_number}
                  </span>
                  <span>·</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    {row.currency} {Number(row.amount).toLocaleString("en-BD")}
                  </span>
                  <span>·</span>
                  <span>{row.plan_name}</span>
                  <span>·</span>
                  <BillingCycleTag cycle={row.billing_cycle} />
                </div>

                {/* Payment details submitted by customer */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
                  {row.payment_method && (
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">Method</p>
                      <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${METHOD_COLOR[row.payment_method] ?? "bg-gray-100 text-gray-700"}`}>
                        {METHOD_LABEL[row.payment_method] ?? row.payment_method}
                      </span>
                    </div>
                  )}
                  {row.sender_number && (
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">Sender Number</p>
                      <p className="text-xs font-mono font-semibold text-gray-800 dark:text-gray-200">{row.sender_number}</p>
                    </div>
                  )}
                  {row.payment_reference && (
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">Reference / TxID</p>
                      <p className="text-xs font-mono font-semibold text-gray-800 dark:text-gray-200">{row.payment_reference}</p>
                    </div>
                  )}
                </div>

                {row.notes && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 italic mt-1">"{row.notes}"</p>
                )}
              </div>

              {/* Action buttons */}
              <div className="shrink-0 flex flex-col gap-2">
                <Button
                  type="primary"
                  icon={<CheckCircle2 className="w-4 h-4" />}
                  loading={actionId === row.id + "/api/subscription/approve-payment"}
                  onClick={() => handleAction(row.id, "/api/subscription/approve-payment")}
                  style={{
                    backgroundColor: "#16a34a",
                    borderColor: "#16a34a",
                    borderRadius: 8,
                    fontWeight: 600,
                  }}
                >
                  Approve
                </Button>
                <Button
                  danger
                  icon={<XCircle className="w-4 h-4" />}
                  loading={actionId === row.id + "/api/subscription/cancel-payment"}
                  onClick={() => handleAction(row.id, "/api/subscription/cancel-payment")}
                  style={{ borderRadius: 8, fontWeight: 600 }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SubscriptionPage() {
  const router = useRouter();
  const { storeId, loading: userLoading, role } = useCurrentUser();
  const [subscription, setSubscription] = useState<StoreSubscription | null>(null);
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [storeInfo, setStoreInfo] = useState<StoreInfo>({ name: "My Store" });
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = role === "super_admin";
  const canPay = !isSuperAdmin;

  function goToPayPage(invoice: SubscriptionInvoice) {
    router.push(`/dashboard/subscription/pay/${invoice.id}`);
  }

  useEffect(() => {
    if (!storeId && !isSuperAdmin) return;
    if (userLoading) return;

    setLoading(true);

    async function load() {
      let sub: StoreSubscription | null = null;
      let invs: SubscriptionInvoice[] = [];

      if (storeId) {
        const [fetchedSub, fetchedInvs, storeData] = await Promise.all([
          getStoreSubscription(storeId),
          getStoreInvoices(storeId),
          getStoreById(storeId),
        ]);
        sub = fetchedSub;
        invs = fetchedInvs;
        if (storeData) {
          setStoreInfo({
            name: storeData.store_name,
            email: storeData.contact_email ?? null,
            phone: storeData.contact_phone ?? null,
            address: storeData.business_address ?? null,
          });
        }
      }

      setSubscription(sub);
      setInvoices(invs);

      const fetchedPlans = await getPlansForStore(role ?? "store_owner", sub?.plan_id ?? null);
      setPlans(fetchedPlans);
    }

    load().finally(() => setLoading(false));
  }, [storeId, userLoading, role, isSuperAdmin]);

  if (userLoading || loading) {
    return (
      <div className="space-y-4 p-2">
        <Skeleton active paragraph={{ rows: 4 }} />
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  if (!storeId && !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Empty description="Store not found" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 max-w-7xl mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Subscription
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage your plan and view billing history.
        </p>
      </div>

      {/* Subscription summary */}
      {subscription ? (
        <SubscriptionCard
          sub={subscription}
          latestInvoice={invoices[0] ?? null}
          store={storeInfo}
          canPay={canPay}
          onPay={goToPayPage}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-10 text-center">
          <CreditCard className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            No active subscription found.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Contact support to set up your plan.
          </p>
        </div>
      )}

      {/* Admin payment approvals panel */}
      <AdminPaymentPanel />

      {/* Plans section */}
      <PlansSection
        plans={plans}
        currentPlanId={subscription?.plan_id ?? null}
        billingCycle={subscription?.billing_cycle ?? "monthly"}
      />

      {/* Invoices table */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-gray-500" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Billing History
          </h2>
          <span className="ml-auto text-xs text-gray-400">
            {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
          </span>
        </div>
        <Table<SubscriptionInvoice>
          dataSource={invoices}
          columns={makeInvoiceColumns(storeInfo, canPay, goToPayPage)}
          rowKey="id"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 1000 }}
          locale={{ emptyText: <Empty description="No invoices yet" /> }}
          size="small"
        />
      </div>

    </div>
  );
}
