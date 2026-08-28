"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Tag, Table, Spin, Segmented, Modal, Popconfirm } from "antd";
import { HandCoins, ArrowLeft, Package, Wallet, TrendingUp, TrendingDown, AlertTriangle, FileText, Trash2 } from "lucide-react";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { getVendorById } from "@/lib/queries/vendor/getVendorById";
import { getVendorStock } from "@/lib/queries/vendor/getVendorStock";
import { getVendorDashboardStats } from "@/lib/queries/vendor/getVendorDashboardStats";
import { getVendorLedger } from "@/lib/queries/vendor/getVendorLedger";
import {
  getVendorInvoiceBalances,
  type VendorInvoiceBalance,
  type VendorInvoiceBalanceItem,
} from "@/lib/queries/vendor/getVendorInvoiceBalances";
import { getStoreById } from "@/lib/queries/stores/getStoreById";
import { recordVendorSettlement } from "@/lib/queries/vendorSettlement/recordVendorSettlement";
import { deleteVendorSettlement } from "@/lib/queries/vendorSettlement/deleteVendorSettlement";
import { createVendorPayment } from "@/lib/queries/vendor/createVendorPayment";
import { deleteVendorPayment } from "@/lib/queries/vendor/deleteVendorPayment";
import { useFeatureGate } from "@/lib/hook/useFeatureGate";
import VendorSettlementModal from "@/app/components/admin/dashboard/vendors/VendorSettlementModal";
import VendorQuickPaymentModal from "@/app/components/admin/dashboard/vendors/VendorQuickPaymentModal";
import { VendorStatCard } from "@/app/components/admin/dashboard/vendors/VendorStatCard";
import FeatureLocked from "@/app/components/admin/common/FeatureLocked";
import type {
  Vendor,
  VendorStockRow,
  VendorDashboardStats,
  VendorLedgerEntry,
  VendorSettlementItemInput,
  VendorPaymentMethod,
} from "@/lib/types/vendor/type";

const LEDGER_TAG_COLOR: Record<VendorLedgerEntry["type"], string> = {
  dispatch: "blue",
  settlement: "purple",
  payment: "green",
};

const PAYMENT_METHOD_LABEL: Record<VendorPaymentMethod, string> = {
  cash: "Cash",
  cod: "COD",
  mobile_banking: "Mobile Banking",
  bank_transfer: "Bank Transfer",
  card: "Card",
  online: "Online",
};

type LedgerPeriod = "day" | "week" | "month" | "all";
const PERIOD_OPTIONS: { label: string; value: LedgerPeriod }[] = [
  { label: "Today", value: "day" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "All Time", value: "all" },
];

// Local numbers are stored as 01XXXXXXXXX; wa.me links need the full
// international number with no leading zero (880 = Bangladesh).
function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0")) return `880${digits.slice(1)}`;
  return digits;
}

export default function VendorDetailPage() {
  const params = useParams();
  const vendorId = params.id as string;
  const router = useRouter();
  const { storeId, user } = useCurrentUser();
  const { loading: featureLoading, allowed } = useFeatureGate(storeId, "vendor_flow");
  const { success, error } = useSheiNotification();
  const { icon: currencyIcon } = useUserCurrencyIcon();
  const currencySymbol = typeof currencyIcon === "string" ? currencyIcon : "";
  const fmtMoney = useCallback(
    (v: number) => `${currencySymbol ? `${currencySymbol} ` : ""}${Number(v).toFixed(2)}`,
    [currencySymbol],
  );

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [stock, setStock] = useState<VendorStockRow[]>([]);
  const [stats, setStats] = useState<VendorDashboardStats | null>(null);
  const [ledger, setLedger] = useState<VendorLedgerEntry[]>([]);
  const [invoiceBalances, setInvoiceBalances] = useState<VendorInvoiceBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [quickPaymentOpen, setQuickPaymentOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [quickPaymentSubmitting, setQuickPaymentSubmitting] = useState(false);
  const [deletingLedgerId, setDeletingLedgerId] = useState<string | null>(null);
  const [ledgerPeriod, setLedgerPeriod] = useState<LedgerPeriod>("all");
  const [statementDownloading, setStatementDownloading] = useState(false);


  const fetchAll = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const [v, s, d, l, ib] = await Promise.all([
        getVendorById(vendorId, storeId),
        getVendorStock(vendorId),
        getVendorDashboardStats(vendorId),
        getVendorLedger(vendorId),
        getVendorInvoiceBalances(vendorId),
      ]);
      setVendor(v);
      setStock(s);
      setStats(d);
      setLedger(l);
      setInvoiceBalances(ib);
    } finally {
      setLoading(false);
    }
  }, [vendorId, storeId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // If the entered amount would push the vendor past their current due into
  // a credit balance, ask for confirmation instead of hard-blocking — the
  // owner may legitimately be collecting an advance.
  const confirmIfOverpaying = useCallback(
    (amount: number) =>
      new Promise<boolean>((resolve) => {
        const currentDue = stats?.current_due ?? 0;
        if (amount <= 0 || currentDue <= 0 || amount <= currentDue) {
          resolve(true);
          return;
        }
        Modal.confirm({
          title: "Payment exceeds current due",
          content: `${vendor?.name ?? "This vendor"} currently owes ${fmtMoney(currentDue)}. Recording ${fmtMoney(amount)} will leave them with a credit balance. Continue?`,
          okText: "Record anyway",
          cancelText: "Cancel",
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      }),
    [stats, vendor, fmtMoney],
  );

  const handleSettlementSubmit = async (payload: {
    settlementDate: string;
    items: VendorSettlementItemInput[];
    paymentAmount: number;
    paymentMethod: VendorPaymentMethod;
    notes?: string;
  }) => {
    if (!storeId) return;
    if (payload.items.length === 0) {
      error("Enter sold or returned quantity for at least one product");
      return;
    }
    if (!(await confirmIfOverpaying(payload.paymentAmount))) return;
    setSubmitting(true);
    try {
      await recordVendorSettlement({
        store_id: storeId,
        vendor_id: vendorId,
        settlement_date: payload.settlementDate,
        items: payload.items,
        payment_amount: payload.paymentAmount,
        payment_method: payload.paymentMethod,
        notes: payload.notes,
        created_by: user?.id ?? null,
      });
      success("Settlement recorded");
      setSettlementOpen(false);
      fetchAll();
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to record settlement");
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickPaymentSubmit = async (payload: {
    paymentDate: string;
    amount: number;
    paymentMethod: VendorPaymentMethod;
    notes?: string;
    vendorOrderId?: string | null;
  }) => {
    if (!storeId) return;
    if (!(await confirmIfOverpaying(payload.amount))) return;
    setQuickPaymentSubmitting(true);
    try {
      await createVendorPayment({
        store_id: storeId,
        vendor_id: vendorId,
        amount: payload.amount,
        payment_date: payload.paymentDate,
        payment_method: payload.paymentMethod,
        notes: payload.notes,
        created_by: user?.id ?? null,
        vendor_order_id: payload.vendorOrderId,
      });
      success("Payment recorded");
      setQuickPaymentOpen(false);
      fetchAll();
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setQuickPaymentSubmitting(false);
    }
  };

  const handleDeleteLedgerEntry = async (entry: VendorLedgerEntry) => {
    if (!storeId || !entry.id) return;
    setDeletingLedgerId(entry.id);
    try {
      if (entry.type === "settlement") {
        await deleteVendorSettlement(entry.id, storeId, user?.id ?? null);
        success("Settlement deleted and stock reversed");
      } else if (entry.type === "payment") {
        const ok = await deleteVendorPayment(entry.id, storeId);
        if (!ok) throw new Error("Payment could not be deleted");
        success("Payment deleted");
      }
      fetchAll();
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingLedgerId(null);
    }
  };

  const handleDownloadStatement = async () => {
    if (!vendor || !storeId) return;
    setStatementDownloading(true);
    try {
      const store = await getStoreById(storeId);
      // Ledger arrives newest-first; the statement reads top-to-bottom with
      // an accumulating balance, so it needs oldest-first order instead.
      const entries = [...ledger].reverse().map((e) => ({
        date: dayjs(e.date).format("DD MMM YYYY"),
        type: e.type,
        reference: e.reference,
        description: e.description,
        receivable: e.receivable,
        paid: e.paid,
      }));

      const res = await fetch("/api/vendor-invoices/statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store: {
            name: store?.store_name ?? "Store",
            address: store?.business_address,
            phone: store?.contact_phone,
            email: store?.contact_email,
          },
          vendor: { name: vendor.name, phone: vendor.phone, address: vendor.address },
          generatedDate: dayjs().format("DD MMM YYYY"),
          entries,
          currentDue: stats?.current_due ?? 0,
        }),
      });
      if (!res.ok) throw new Error("Failed to generate statement");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vendor_statement_${vendor.name.replace(/\s+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      // The statement itself still has to be attached manually in the chat
      // that opens — WhatsApp's web link only pre-fills text, it can't
      // attach a file without the (paid, separately set up) Business API.
      const waNumber = toWhatsAppNumber(vendor.phone);
      const message = `Hi ${vendor.name}, please find your account statement attached. Current due: ${fmtMoney(stats?.current_due ?? 0)}.`;
      window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`, "_blank");
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to download statement");
    } finally {
      setStatementDownloading(false);
    }
  };

  const filteredLedger = useMemo(() => {
    if (ledgerPeriod === "all") return ledger;
    const unit = ledgerPeriod; // "day" | "week" | "month" — all valid dayjs OpUnitType values
    const start = dayjs().startOf(unit);
    const end = dayjs().endOf(unit);
    return ledger.filter((entry) => {
      const d = dayjs(entry.date);
      return !d.isBefore(start) && !d.isAfter(end);
    });
  }, [ledger, ledgerPeriod]);

  const paidInPeriod = useMemo(
    () => filteredLedger.reduce((sum, e) => sum + (e.paid ?? 0), 0),
    [filteredLedger],
  );

  const stockValue = useMemo(
    () => stock.reduce((sum, s) => sum + s.quantity_available * (s.last_vendor_tp ?? 0), 0),
    [stock],
  );

  // Flags vendors worth chasing for payment: money is owed and either
  // nothing has ever been collected, or it's been over two weeks since the
  // last payment — a reasonable default cadence for a weekly/monthly
  // settlement business like this one.
  const daysSinceLastPayment = stats?.last_payment_date
    ? dayjs().diff(dayjs(stats.last_payment_date), "day")
    : null;
  const needsCollection =
    (stats?.current_due ?? 0) > 0 && (daysSinceLastPayment === null || daysSinceLastPayment > 14);
  const overCreditLimit =
    !!vendor && vendor.credit_limit > 0 && (stats?.current_due ?? 0) > vendor.credit_limit;

  const stockColumns: ColumnsType<VendorStockRow> = [
    { title: "Product", dataIndex: "product_name", key: "product_name" },
    { title: "SKU", dataIndex: "sku", key: "sku", width: 120, render: (v) => v || "—" },
    { title: "Current Stock", dataIndex: "quantity_available", key: "quantity_available", width: 130 },
    {
      title: "Last Vendor TP",
      dataIndex: "last_vendor_tp",
      key: "last_vendor_tp",
      width: 130,
      render: (v: number | null) => (v != null ? fmtMoney(v) : "—"),
    },
    {
      title: "Last Movement",
      key: "last_movement",
      width: 160,
      render: (_, record) => {
        const daysSince = dayjs().diff(dayjs(record.updated_at), "day");
        const isSlowMoving = record.quantity_available > 0 && daysSince > 30;
        return (
          <div>
            <span className="text-muted-foreground">
              {daysSince === 0 ? "today" : `${daysSince}d ago`}
            </span>
            {isSlowMoving && (
              <Tag color="default" className="rounded-full ml-2">
                Slow Moving
              </Tag>
            )}
          </div>
        );
      },
    },
  ];

  const invoiceColumns: ColumnsType<VendorInvoiceBalance> = [
    { title: "Invoice #", dataIndex: "invoice_number", key: "invoice_number", width: 150 },
    {
      title: "Dispatch Date",
      dataIndex: "order_date",
      key: "order_date",
      width: 130,
      render: (d: string) => dayjs(d).format("DD MMM YYYY"),
    },
    {
      title: "Grand Total",
      dataIndex: "grand_total",
      key: "grand_total",
      width: 120,
      render: (v: number) => fmtMoney(v),
    },
    {
      title: "Paid",
      dataIndex: "paid_allocated",
      key: "paid_allocated",
      width: 120,
      render: (v: number) => fmtMoney(v),
    },
    {
      title: "Due",
      dataIndex: "due_remaining",
      key: "due_remaining",
      width: 120,
      render: (v: number) => (
        <span className={v > 0 ? "text-red-500 font-semibold" : "text-muted-foreground"}>
          {fmtMoney(v)}
        </span>
      ),
    },
    {
      title: "Status",
      key: "status",
      width: 130,
      render: (_, record) => {
        if (record.due_remaining <= 0.005) {
          return <Tag color="green" className="rounded-full">Paid</Tag>;
        }
        if (record.paid_allocated > 0) {
          return <Tag color="gold" className="rounded-full">Partially Paid</Tag>;
        }
        return <Tag color="red" className="rounded-full">Unpaid</Tag>;
      },
    },
  ];

  const invoiceItemColumns: ColumnsType<VendorInvoiceBalanceItem> = [
    { title: "Product", dataIndex: "product_name", key: "product_name" },
    { title: "SKU", dataIndex: "sku", key: "sku", width: 120, render: (v) => v || "—" },
    { title: "Qty", dataIndex: "quantity", key: "quantity", width: 80 },
    {
      title: "Vendor TP",
      dataIndex: "vendor_tp",
      key: "vendor_tp",
      width: 110,
      render: (v: number) => fmtMoney(v),
    },
    {
      title: "Line Total",
      dataIndex: "line_total",
      key: "line_total",
      width: 120,
      render: (v: number) => fmtMoney(v),
    },
  ];

  const ledgerColumns: ColumnsType<VendorLedgerEntry> = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      width: 120,
      render: (d: string) => dayjs(d).format("DD MMM YYYY"),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 110,
      render: (t: VendorLedgerEntry["type"]) => (
        <Tag color={LEDGER_TAG_COLOR[t]} className="rounded-full capitalize">
          {t}
        </Tag>
      ),
    },
    { title: "Reference", dataIndex: "reference", key: "reference", width: 120 },
    { title: "Description", dataIndex: "description", key: "description" },
    {
      title: "Method",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      width: 130,
      render: (m?: VendorPaymentMethod) => (m ? PAYMENT_METHOD_LABEL[m] : "—"),
    },
    {
      title: "Receivable",
      dataIndex: "receivable",
      key: "receivable",
      width: 110,
      render: (v?: number) => (v ? fmtMoney(v) : "—"),
    },
    {
      title: "Paid",
      dataIndex: "paid",
      key: "paid",
      width: 100,
      render: (v?: number) => (v ? fmtMoney(v) : "—"),
    },
    {
      title: "",
      key: "actions",
      width: 50,
      render: (_, record) =>
        record.deletable && record.id ? (
          <Popconfirm
            title={
              record.type === "settlement"
                ? "Delete this settlement? Stock it moved will be reversed."
                : "Delete this payment?"
            }
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDeleteLedgerEntry(record)}
          >
            <Button
              type="text"
              danger
              size="small"
              icon={<Trash2 size={14} />}
              loading={deletingLedgerId === record.id}
            />
          </Popconfirm>
        ) : null,
    },
  ];

  if (loading || featureLoading || !vendor) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!allowed) {
    return <FeatureLocked />;
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="bg-card border-b border-border px-4 sm:px-8 py-4 sm:py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              type="text"
              icon={<ArrowLeft size={16} />}
              onClick={() => router.push("/dashboard/vendors")}
              className="rounded-xl"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-foreground m-0">{vendor.name}</h1>
                <Tag color={vendor.status === "active" ? "green" : "default"} className="rounded-full">
                  {vendor.status === "active" ? "Active" : "Inactive"}
                </Tag>
                {needsCollection && (
                  <Tag color="red" icon={<AlertTriangle size={12} />} className="rounded-full">
                    Needs Collection
                  </Tag>
                )}
                {overCreditLimit && (
                  <Tag color="volcano" className="rounded-full">
                    Over Credit Limit
                  </Tag>
                )}
              </div>
              <p className="text-xs text-muted-foreground m-0">
                {vendor.phone} {vendor.business_name ? `· ${vendor.business_name}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              icon={<FileText size={16} />}
              loading={statementDownloading}
              onClick={handleDownloadStatement}
              className="rounded-xl h-9 font-medium"
            >
              Statement
            </Button>
            <Button
              icon={<Wallet size={16} />}
              onClick={() => setQuickPaymentOpen(true)}
              className="rounded-xl h-9 font-semibold border-none"
              style={{
                background: "linear-gradient(135deg, #38bdf8, #2563eb)",
                color: "white",
                boxShadow: "0 4px 14px rgba(37,99,235,0.4)",
              }}
            >
              Record Payment
            </Button>
            <Button
              type="primary"
              icon={<HandCoins size={16} />}
              onClick={() => setSettlementOpen(true)}
              className="rounded-xl h-9 font-semibold border-none"
              style={{
                background: "linear-gradient(135deg, #10b981, #0d9488)",
                boxShadow: "0 4px 14px rgba(16,185,129,0.4)",
              }}
            >
              Record Settlement
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <VendorStatCard
            icon={<Package size={18} />}
            label="Current Vendor Stock"
            value={String(stats?.current_stock_count ?? 0)}
            hint={`Value: ${fmtMoney(stockValue)}`}
            tone="indigo"
          />
          <VendorStatCard
            icon={<TrendingUp size={18} />}
            label="Total Sold"
            value={String(stats?.total_sold ?? 0)}
            tone="emerald"
          />
          <VendorStatCard
            icon={<TrendingDown size={18} />}
            label="Total Returned"
            value={String(stats?.total_returned ?? 0)}
            tone="amber"
          />
          <VendorStatCard
            icon={<Wallet size={18} />}
            label="Current Due"
            value={fmtMoney(stats?.current_due ?? 0)}
            hint={
              (vendor?.credit_limit ?? 0) > 0
                ? `Limit: ${fmtMoney(vendor!.credit_limit)}`
                : daysSinceLastPayment != null
                  ? `Last paid ${daysSinceLastPayment === 0 ? "today" : `${daysSinceLastPayment}d ago`}`
                  : "No payment yet"
            }
            tone="rose"
          />
          <VendorStatCard
            icon={<TrendingUp size={18} />}
            label="Realized Profit"
            value={fmtMoney(stats?.margin_realized ?? 0)}
            hint={`Potential: ${fmtMoney(stats?.margin_dispatched ?? 0)}`}
            tone="sky"
          />
          <VendorStatCard
            icon={<AlertTriangle size={18} />}
            label="Slow-Moving Stock"
            value={String(stats?.slow_moving_count ?? 0)}
            hint="SKUs unsold 30+ days"
            tone="slate"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-card rounded-2xl border border-border shadow-sm p-4">
          <div>
            <div className="text-xs text-gray-400">Total Dispatched</div>
            <div className="font-semibold text-foreground">{stats?.total_dispatched ?? 0}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Total Receivable</div>
            <div className="font-semibold text-foreground">
              {fmtMoney(stats?.total_receivable ?? 0)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Total Paid</div>
            <div className="font-semibold text-foreground">
              {fmtMoney(stats?.total_paid ?? 0)}
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-bold text-foreground mb-3">Current Vendor Stock</h2>
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden overflow-x-auto">
            <Table
              columns={stockColumns}
              dataSource={stock}
              rowKey="id"
              pagination={false}
              locale={{ emptyText: "No stock dispatched to this vendor yet" }}
              scroll={{ x: 660 }}
            />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-bold text-foreground mb-1">Invoices</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Paid is applied oldest-invoice-first from total payments received — it&apos;s an
            estimate of which invoices are cleared first, not a per-item reconciliation.
            &quot;Current Due&quot; above is the authoritative total. Expand a row to see which
            products were dispatched in that invoice.
          </p>
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden overflow-x-auto">
            <Table
              columns={invoiceColumns}
              dataSource={invoiceBalances}
              rowKey="order_id"
              expandable={{
                expandedRowRender: (record) => (
                  <div className="space-y-2">
                    <Table
                      columns={invoiceItemColumns}
                      dataSource={record.items}
                      rowKey={(item) => `${record.order_id}-${item.product_name}-${item.sku ?? ""}`}
                      pagination={false}
                      size="small"
                      locale={{ emptyText: "No line items" }}
                    />
                    {/* Product lines only sum to the subtotal — Grand Total also
                        folds in delivery cost and any discount, so spell out the
                        reconciliation here rather than leaving an unexplained gap. */}
                    <div className="flex flex-wrap justify-end gap-x-6 gap-y-1 text-xs text-muted-foreground pr-2">
                      <span>Subtotal: {fmtMoney(record.subtotal)}</span>
                      {record.delivery_cost > 0 && (
                        <span>+ Delivery: {fmtMoney(record.delivery_cost)}</span>
                      )}
                      {record.discount_amount > 0 && (
                        <span>− Discount: {fmtMoney(record.discount_amount)}</span>
                      )}
                      <span className="font-semibold text-foreground">
                        = Grand Total: {fmtMoney(record.grand_total)}
                      </span>
                    </div>
                  </div>
                ),
                rowExpandable: (record) => record.items.length > 0,
              }}
              pagination={false}
              locale={{ emptyText: "No confirmed vendor orders yet" }}
              scroll={{ x: 700 }}
            />
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-bold text-foreground m-0">Vendor Ledger</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">
                Cash collected {PERIOD_OPTIONS.find((p) => p.value === ledgerPeriod)?.label.toLowerCase()}:{" "}
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {fmtMoney(paidInPeriod)}
                </span>
              </span>
              <Segmented
                value={ledgerPeriod}
                onChange={(v) => setLedgerPeriod(v as LedgerPeriod)}
                options={PERIOD_OPTIONS}
              />
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden overflow-x-auto">
            <Table
              columns={ledgerColumns}
              dataSource={filteredLedger}
              rowKey={(r) => `${r.type}-${r.reference}-${r.date}`}
              pagination={false}
              locale={{ emptyText: "No dispatch, settlement, or payment history in this period" }}
              scroll={{ x: 850 }}
            />
          </div>
        </div>
      </div>

      <VendorSettlementModal
        open={settlementOpen}
        stock={stock}
        submitting={submitting}
        onSubmit={handleSettlementSubmit}
        onCancel={() => setSettlementOpen(false)}
      />

      <VendorQuickPaymentModal
        open={quickPaymentOpen}
        submitting={quickPaymentSubmitting}
        invoiceOptions={invoiceBalances
          .filter((b) => b.due_remaining > 0.005)
          .map((b) => ({
            order_id: b.order_id,
            invoice_number: b.invoice_number,
            due_remaining: b.due_remaining,
          }))}
        onSubmit={handleQuickPaymentSubmit}
        onCancel={() => setQuickPaymentOpen(false)}
      />
    </div>
  );
}
