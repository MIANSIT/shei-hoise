"use client";

import { useEffect, useState } from "react";
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

function SubscriptionStatusTag({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    active: { color: "success", label: "Active" },
    trial: { color: "processing", label: "Trial" },
    expired: { color: "default", label: "Expired" },
    cancelled: { color: "error", label: "Cancelled" },
    past_due: { color: "warning", label: "Past Due" },
    pending: { color: "warning", label: "Pending" },
  };
  const cfg = map[status] ?? { color: "default", label: status };
  return <Tag color={cfg.color}>{cfg.label}</Tag>;
}

function InvoiceStatusTag({ status }: { status: string }) {
  if (status === "unpaid") {
    return (
      <Tag color="error">
        <strong>Un Paid</strong>
      </Tag>
    );
  }
  const map: Record<string, { color: string; label: string }> = {
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

function makeInvoiceColumns(store: StoreInfo): ColumnsType<SubscriptionInvoice> {
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
    render: (v: string | null) =>
      v ? (
        <span className="capitalize text-xs">{v.replace(/_/g, " ")}</span>
      ) : (
        <span className="text-gray-400 text-xs">—</span>
      ),
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
    width: 48,
    render: (_: unknown, record: SubscriptionInvoice) => (
      <Tooltip title="Download PDF">
        <Button
          type="text"
          size="small"
          icon={<Download className="w-3.5 h-3.5" />}
          onClick={() => downloadInvoicePdf(record, store)}
        />
      </Tooltip>
    ),
  },
  ];
}

function SubscriptionCard({
  sub,
  latestInvoice,
  store,
}: {
  sub: StoreSubscription;
  latestInvoice: SubscriptionInvoice | null;
  store: StoreInfo;
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

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
          <CreditCard className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Current Subscription
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {sub.plan?.description ?? "Your active plan details"}
          </p>
        </div>
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
              <p className="text-sm capitalize text-gray-800 dark:text-gray-200">
                {latestInvoice.payment_method
                  ? latestInvoice.payment_method.replace(/_/g, " ")
                  : "—"}
              </p>
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

export default function SubscriptionPage() {
  const { storeId, loading: userLoading } = useCurrentUser();
  const [subscription, setSubscription] = useState<StoreSubscription | null>(null);
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [storeInfo, setStoreInfo] = useState<StoreInfo>({ name: "My Store" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) return;

    setLoading(true);
    Promise.all([
      getStoreSubscription(storeId),
      getStoreInvoices(storeId),
      getStoreById(storeId),
    ])
      .then(([sub, invs, storeData]) => {
        setSubscription(sub);
        setInvoices(invs);
        if (storeData) {
          setStoreInfo({
            name: storeData.store_name,
            email: storeData.contact_email ?? null,
            phone: storeData.contact_phone ?? null,
            address: storeData.business_address ?? null,
          });
        }
      })
      .finally(() => setLoading(false));
  }, [storeId]);

  if (userLoading || loading) {
    return (
      <div className="space-y-4 p-2">
        <Skeleton active paragraph={{ rows: 4 }} />
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  if (!storeId) {
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
        <SubscriptionCard sub={subscription} latestInvoice={invoices[0] ?? null} store={storeInfo} />
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
          columns={makeInvoiceColumns(storeInfo)}
          rowKey="id"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 900 }}
          locale={{ emptyText: <Empty description="No invoices yet" /> }}
          size="small"
        />
      </div>
    </div>
  );
}
