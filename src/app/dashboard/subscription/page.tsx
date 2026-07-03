"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Table, Tag, Skeleton, Empty, Button, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CreditCard,
  Package,
  AlertCircle,
  XCircle,
  Download,
  Wallet,
  CheckCircle2,
  ShieldCheck,
  Store,
  ArrowRight,
} from "lucide-react";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useTranslation } from "@/lib/hook/useTranslation";
import { downloadInvoicePdf, type StoreInfo } from "@/lib/utils/downloadInvoicePdf";
import { getStoreById } from "@/lib/queries/stores/getStoreById";
import {
  getStoreSubscription,
  getStoreInvoices,
  type StoreSubscription,
  type SubscriptionInvoice,
} from "@/lib/queries/subscription/getStoreSubscription";
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

const SUBSCRIPTION_STATUS_STYLES: Record<
  string,
  { labelKey: string; header: string; border: string; pill: string; dot: string }
> = {
  active: {
    labelKey: "subStatusActive",
    header: "bg-emerald-50 dark:bg-emerald-950/20",
    border: "border-emerald-100 dark:border-emerald-900/40",
    pill: "bg-emerald-600 text-white",
    dot: "bg-emerald-200",
  },
  trial: {
    labelKey: "subStatusTrial",
    header: "bg-blue-50 dark:bg-blue-950/20",
    border: "border-blue-100 dark:border-blue-900/40",
    pill: "bg-blue-600 text-white",
    dot: "bg-blue-200",
  },
  incomplete: {
    labelKey: "subStatusIncomplete",
    header: "bg-amber-50 dark:bg-amber-950/20",
    border: "border-amber-100 dark:border-amber-900/40",
    pill: "bg-amber-500 text-white",
    dot: "bg-amber-100",
  },
  pending: {
    labelKey: "subStatusPending",
    header: "bg-amber-50 dark:bg-amber-950/20",
    border: "border-amber-100 dark:border-amber-900/40",
    pill: "bg-amber-500 text-white",
    dot: "bg-amber-100",
  },
  past_due: {
    labelKey: "subStatusPastDue",
    header: "bg-orange-50 dark:bg-orange-950/20",
    border: "border-orange-100 dark:border-orange-900/40",
    pill: "bg-orange-500 text-white",
    dot: "bg-orange-100",
  },
  expired: {
    labelKey: "subStatusExpired",
    header: "bg-gray-50 dark:bg-gray-800/40",
    border: "border-gray-200 dark:border-gray-700",
    pill: "bg-gray-500 text-white",
    dot: "bg-gray-200",
  },
  cancelled: {
    labelKey: "subStatusCancelled",
    header: "bg-rose-50 dark:bg-rose-950/20",
    border: "border-rose-100 dark:border-rose-900/40",
    pill: "bg-rose-600 text-white",
    dot: "bg-rose-200",
  },
};

function getSubscriptionStatusStyle(status: string, t: ReturnType<typeof useTranslation>) {
  const style = SUBSCRIPTION_STATUS_STYLES[status];
  const adminT = t.admin as unknown as Record<string, string>;
  return {
    label: style ? adminT[style.labelKey] : status,
    header: style?.header ?? "bg-gray-50 dark:bg-gray-800/40",
    border: style?.border ?? "border-gray-200 dark:border-gray-700",
    pill: style?.pill ?? "bg-gray-500 text-white",
    dot: style?.dot ?? "bg-gray-200",
  };
}

// ── Small UI atoms ─────────────────────────────────────────────────────────────

function InvoiceStatusTag({ status }: { status: string }) {
  const t = useTranslation();
  const map: Record<string, { color: string; label: string }> = {
    unpaid: { color: "error", label: t.admin.subInvoiceStatusUnpaid },
    submitted: { color: "blue", label: t.admin.subInvoiceStatusSubmitted },
    paid: { color: "success", label: t.admin.subInvoiceStatusPaid },
    pending: { color: "warning", label: t.admin.subInvoiceStatusPending },
    failed: { color: "error", label: t.admin.subInvoiceStatusFailed },
    cancelled: { color: "default", label: t.admin.subInvoiceStatusCancelled },
    refunded: { color: "purple", label: t.admin.subInvoiceStatusRefunded },
    overdue: { color: "error", label: t.admin.subInvoiceStatusOverdue },
  };
  const cfg = map[status] ?? { color: "default", label: status };
  return <Tag color={cfg.color}>{cfg.label}</Tag>;
}

function BillingCycleTag({ cycle }: { cycle: string }) {
  const t = useTranslation();
  const label = cycle === "yearly" ? t.admin.subCycleYearly : cycle === "monthly" ? t.admin.subCycleMonthly : cycle;
  return <Tag color="blue">{label}</Tag>;
}

// ── PaymentMethodBadge ──────────────────────────────────────────────────────

const METHOD_STYLES: Record<string, { bg: string; text: string }> = {
  bkash: { bg: "bg-pink-100", text: "text-pink-700" },
  nagad: { bg: "bg-orange-100", text: "text-orange-700" },
  bank: { bg: "bg-blue-100", text: "text-blue-700" },
};

function PaymentMethodBadge({ method }: { method: string | null }) {
  const t = useTranslation();
  if (!method) return <span className="text-gray-400 text-xs">—</span>;
  const labels: Record<string, string> = {
    bkash: t.admin.subMethodBkash,
    nagad: t.admin.subMethodNagad,
    bank: t.admin.subMethodBankTransfer,
  };
  const style = METHOD_STYLES[method] ?? { bg: "bg-gray-100", text: "text-gray-700" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      {labels[method] ?? method}
    </span>
  );
}

// ── Invoice table ─────────────────────────────────────────────────────────────

function makeInvoiceColumns(
  store: StoreInfo,
  canPay: boolean,
  onPay: (inv: SubscriptionInvoice) => void,
  t: ReturnType<typeof useTranslation>,
): ColumnsType<SubscriptionInvoice> {
  return [
    {
      title: t.admin.subColInvoiceNum,
      dataIndex: "invoice_number",
      key: "invoice_number",
      render: (v: string) => (
        <span className="font-mono text-xs font-medium text-gray-700 dark:text-gray-300">
          {v}
        </span>
      ),
    },
    {
      title: t.admin.subColPlan,
      dataIndex: "plan_name",
      key: "plan_name",
    },
    {
      title: t.admin.subColAmount,
      key: "amount",
      render: (_: unknown, record: SubscriptionInvoice) =>
        formatAmount(record.amount, record.currency),
    },
    {
      title: t.admin.subColBilling,
      dataIndex: "billing_cycle",
      key: "billing_cycle",
      render: (v: string) => <BillingCycleTag cycle={v} />,
    },
    {
      title: t.admin.subColPeriod,
      key: "period",
      render: (_: unknown, record: SubscriptionInvoice) => (
        <span className="text-xs text-gray-500">
          {formatDate(record.period_start)} — {formatDate(record.period_end)}
        </span>
      ),
    },
    {
      title: t.admin.subColStatus,
      dataIndex: "status",
      key: "status",
      render: (v: string) => <InvoiceStatusTag status={v} />,
    },
    {
      title: t.admin.subColPaymentMethod,
      dataIndex: "payment_method",
      key: "payment_method",
      render: (v: string | null) => <PaymentMethodBadge method={v} />,
    },
    {
      title: t.admin.subColPaidAt,
      dataIndex: "paid_at",
      key: "paid_at",
      render: (v: string | null) => (
        <span className="text-xs">{v ? formatDate(v) : "—"}</span>
      ),
    },
    {
      title: t.admin.subColReference,
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
            <Tooltip title={t.admin.subTooltipPayNow}>
              <Button
                size="small"
                type="primary"
                icon={<Wallet className="w-3 h-3" />}
                onClick={() => onPay(record)}
                style={{ backgroundColor: "#7c3aed", borderColor: "#7c3aed", fontSize: 11 }}
              >
                {t.admin.subBtnPay}
              </Button>
            </Tooltip>
          )}
          <Tooltip title={t.admin.subTooltipDownloadPdf}>
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
  const t = useTranslation();
  const showPayBanner =
    canPay && latestInvoice && PAYABLE_STATUSES.has(latestInvoice.status);
  const statusStyle = getSubscriptionStatusStyle(sub.status, t);

  const metaItems = [
    { label: t.admin.subMetaStarted, value: formatDate(sub.started_at ?? sub.current_period_start) },
    { label: t.admin.subMetaExpires, value: formatDate(sub.expires_at ?? sub.current_period_end) },
    ...(sub.trial_ends_at ? [{ label: t.admin.subMetaTrialEnds, value: formatDate(sub.trial_ends_at) }] : []),
    ...(sub.canceled_at ? [{ label: t.admin.subMetaCancelledAt, value: formatDate(sub.canceled_at) }] : []),
    ...(sub.payment_provider
      ? [{ label: t.admin.subMetaPaymentProvider, value: sub.payment_provider.replace(/_/g, " ") }]
      : []),
  ];

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
      {/* Status hero */}
      <div className={`px-6 pt-6 pb-5 ${statusStyle.header} border-b ${statusStyle.border}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${statusStyle.pill}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                {statusStyle.label}
              </span>
              <BillingCycleTag cycle={sub.billing_cycle} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {sub.plan?.name ?? "—"}
            </h2>
            {sub.plan?.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {sub.plan.description}
              </p>
            )}
          </div>
          {showPayBanner && (
            <Button
              type="primary"
              icon={<Wallet className="w-3.5 h-3.5" />}
              onClick={() => onPay(latestInvoice!)}
              style={{ backgroundColor: "#7c3aed", borderColor: "#7c3aed" }}
            >
              {t.admin.subTooltipPayNow}
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-1 mt-4 text-xs text-gray-600 dark:text-gray-400">
          {metaItems.map((item) => (
            <span key={item.label}>
              <span className="text-gray-400 dark:text-gray-500">{item.label}:</span>{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">
                {item.value}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Latest invoice strip */}
      {latestInvoice && (
        <div className="px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4 flex-wrap text-sm">
            <span className="font-mono text-xs text-gray-400 dark:text-gray-500">
              {latestInvoice.invoice_number}
            </span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {formatAmount(latestInvoice.amount, latestInvoice.currency)}
            </span>
            <InvoiceStatusTag status={latestInvoice.status} />
            <PaymentMethodBadge method={latestInvoice.payment_method} />
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {latestInvoice.paid_at ? t.admin.subInvoiceStatusPaid : t.admin.subDuePrefix} {formatDate(latestInvoice.paid_at ?? latestInvoice.due_date)}
            </span>
          </div>
          <Tooltip title={t.admin.subTooltipDownloadPdf}>
            <button
              onClick={() => downloadInvoicePdf(latestInvoice, store)}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400 dark:text-gray-500"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        </div>
      )}

      {sub.cancels_at_period_end && (
        <div className="mx-6 mb-5 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {t.admin.subCancelAtPeriodEnd}
        </div>
      )}
    </div>
  );
}


// ── Admin payment panel ───────────────────────────────────────────────────────

const METHOD_COLOR: Record<string, string> = {
  bkash: "bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300",
  nagad: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  bank: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
};

function AdminPaymentPanel() {
  const t = useTranslation();
  const METHOD_LABEL: Record<string, string> = {
    bkash: t.admin.subMethodBkash,
    nagad: t.admin.subMethodNagad,
    bank: t.admin.subMethodBankShort,
  };
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
          {t.admin.subPaymentApprovals}
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
          <p className="text-sm text-gray-500 dark:text-gray-400">{t.admin.subNoPendingPayments}</p>
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
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">{t.admin.subFieldMethod}</p>
                      <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${METHOD_COLOR[row.payment_method] ?? "bg-gray-100 text-gray-700"}`}>
                        {METHOD_LABEL[row.payment_method] ?? row.payment_method}
                      </span>
                    </div>
                  )}
                  {row.sender_number && (
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">{t.admin.subFieldSenderNumber}</p>
                      <p className="text-xs font-mono font-semibold text-gray-800 dark:text-gray-200">{row.sender_number}</p>
                    </div>
                  )}
                  {row.payment_reference && (
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">{t.admin.subFieldReferenceTxid}</p>
                      <p className="text-xs font-mono font-semibold text-gray-800 dark:text-gray-200">{row.payment_reference}</p>
                    </div>
                  )}
                </div>

                {row.notes && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 italic mt-1">&quot;{row.notes}&quot;</p>
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
                  {t.admin.subBtnApprove}
                </Button>
                <Button
                  danger
                  icon={<XCircle className="w-4 h-4" />}
                  loading={actionId === row.id + "/api/subscription/cancel-payment"}
                  onClick={() => handleAction(row.id, "/api/subscription/cancel-payment")}
                  style={{ borderRadius: 8, fontWeight: 600 }}
                >
                  {t.admin.subBtnCancel}
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
  const t = useTranslation();
  const { storeId, loading: userLoading, role } = useCurrentUser();
  const [subscription, setSubscription] = useState<StoreSubscription | null>(null);
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [storeInfo, setStoreInfo] = useState<StoreInfo>({ name: "My Store" });
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
    }

    load().finally(() => setLoading(false));
  }, [storeId, userLoading, isSuperAdmin]);

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
        <Empty description={t.admin.subStoreNotFound} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 max-w-7xl mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {t.admin.subPageTitle}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t.admin.subPageDesc}
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
            {t.admin.subNoActiveTitle}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {t.admin.subNoActiveDesc}
          </p>
        </div>
      )}

      {/* Admin payment approvals panel */}
      {isSuperAdmin && <AdminPaymentPanel />}

      {/* Change plan CTA */}
      {canPay && (
        <div className="rounded-2xl border border-violet-200 dark:border-violet-800 bg-linear-to-r from-violet-50 to-white dark:from-violet-950/30 dark:to-gray-900 p-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-100 dark:bg-violet-900/40">
              <Package className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {subscription ? t.admin.subChangePlanTitle : t.admin.subGetStartedTitle}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t.admin.subChangePlanDesc}
              </p>
            </div>
          </div>
          <Button
            type="primary"
            icon={<ArrowRight className="w-3.5 h-3.5" />}
            iconPlacement="end"
            onClick={() => router.push("/dashboard/subscription/plans")}
            style={{ backgroundColor: "#7c3aed", borderColor: "#7c3aed" }}
          >
            {subscription ? t.admin.subViewAllPlans : t.admin.subBrowsePlans}
          </Button>
        </div>
      )}

      {/* Invoices table */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-gray-500" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {t.admin.subBillingHistory}
          </h2>
          <span className="ml-auto text-xs text-gray-400">
            {invoices.length} {invoices.length !== 1 ? t.admin.subInvoicePlural : t.admin.subInvoiceSingular}
          </span>
        </div>
        <Table<SubscriptionInvoice>
          dataSource={invoices}
          columns={makeInvoiceColumns(storeInfo, canPay, goToPayPage, t)}
          rowKey="id"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 1000 }}
          locale={{ emptyText: <Empty description={t.admin.subNoInvoices} /> }}
          size="small"
        />
      </div>

    </div>
  );
}
