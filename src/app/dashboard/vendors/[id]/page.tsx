"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Tag, Table, Spin, Segmented } from "antd";
import { HandCoins, ArrowLeft, Package, Wallet, TrendingUp, TrendingDown, AlertTriangle, FileText } from "lucide-react";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { getVendorById } from "@/lib/queries/vendor/getVendorById";
import { getVendorStock } from "@/lib/queries/vendor/getVendorStock";
import { getVendorDashboardStats } from "@/lib/queries/vendor/getVendorDashboardStats";
import { getVendorLedger } from "@/lib/queries/vendor/getVendorLedger";
import { getStoreById } from "@/lib/queries/stores/getStoreById";
import { recordVendorSettlement } from "@/lib/queries/vendorSettlement/recordVendorSettlement";
import VendorSettlementModal from "@/app/components/admin/dashboard/vendors/VendorSettlementModal";
import { VendorStatCard } from "@/app/components/admin/dashboard/vendors/VendorStatCard";
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
  const [loading, setLoading] = useState(true);
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ledgerPeriod, setLedgerPeriod] = useState<LedgerPeriod>("all");
  const [statementDownloading, setStatementDownloading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const [v, s, d, l] = await Promise.all([
        getVendorById(vendorId, storeId),
        getVendorStock(vendorId),
        getVendorDashboardStats(vendorId),
        getVendorLedger(vendorId),
      ]);
      setVendor(v);
      setStock(s);
      setStats(d);
      setLedger(l);
    } finally {
      setLoading(false);
    }
  }, [vendorId, storeId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

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
            <span className="text-gray-500 dark:text-gray-400">
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
  ];

  if (loading || !vendor) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 sm:px-8 py-4 sm:py-5">
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
                <h1 className="text-lg font-bold text-gray-900 dark:text-white m-0">{vendor.name}</h1>
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
              <p className="text-xs text-gray-400 dark:text-gray-500 m-0">
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
            icon={<Package size={18} color="white" />}
            label="Current Vendor Stock"
            value={String(stats?.current_stock_count ?? 0)}
            hint={`Value: ${fmtMoney(stockValue)}`}
            accent="linear-gradient(135deg,#6366f1,#4f46e5)"
          />
          <VendorStatCard
            icon={<TrendingUp size={18} color="white" />}
            label="Total Sold"
            value={String(stats?.total_sold ?? 0)}
            accent="linear-gradient(135deg,#10b981,#059669)"
          />
          <VendorStatCard
            icon={<TrendingDown size={18} color="white" />}
            label="Total Returned"
            value={String(stats?.total_returned ?? 0)}
            accent="linear-gradient(135deg,#f59e0b,#d97706)"
          />
          <VendorStatCard
            icon={<Wallet size={18} color="white" />}
            label="Current Due"
            value={fmtMoney(stats?.current_due ?? 0)}
            hint={
              (vendor?.credit_limit ?? 0) > 0
                ? `Limit: ${fmtMoney(vendor!.credit_limit)}`
                : daysSinceLastPayment != null
                  ? `Last paid ${daysSinceLastPayment === 0 ? "today" : `${daysSinceLastPayment}d ago`}`
                  : "No payment yet"
            }
            accent="linear-gradient(135deg,#ef4444,#dc2626)"
          />
          <VendorStatCard
            icon={<TrendingUp size={18} color="white" />}
            label="Margin Dispatched"
            value={fmtMoney(stats?.margin_dispatched ?? 0)}
            hint="On confirmed dispatches"
            accent="linear-gradient(135deg,#0ea5e9,#0284c7)"
          />
          <VendorStatCard
            icon={<AlertTriangle size={18} color="white" />}
            label="Slow-Moving Stock"
            value={String(stats?.slow_moving_count ?? 0)}
            hint="SKUs unsold 30+ days"
            accent="linear-gradient(135deg,#78716c,#57534e)"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
          <div>
            <div className="text-xs text-gray-400">Total Dispatched</div>
            <div className="font-semibold text-gray-800 dark:text-gray-100">{stats?.total_dispatched ?? 0}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Total Receivable</div>
            <div className="font-semibold text-gray-800 dark:text-gray-100">
              {fmtMoney(stats?.total_receivable ?? 0)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Total Paid</div>
            <div className="font-semibold text-gray-800 dark:text-gray-100">
              {fmtMoney(stats?.total_paid ?? 0)}
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Current Vendor Stock</h2>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden overflow-x-auto">
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
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 m-0">Vendor Ledger</h2>
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden overflow-x-auto">
            <Table
              columns={ledgerColumns}
              dataSource={filteredLedger}
              rowKey={(r) => `${r.type}-${r.reference}-${r.date}`}
              pagination={false}
              locale={{ emptyText: "No dispatch, settlement, or payment history in this period" }}
              scroll={{ x: 800 }}
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
    </div>
  );
}
