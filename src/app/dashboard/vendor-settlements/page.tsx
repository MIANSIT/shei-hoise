"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Pagination, Select, Tag, Table, Spin, Popconfirm } from "antd";
import { HandCoins, Wallet, Trash2 } from "lucide-react";
import type { ColumnsType } from "antd/es/table";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";

import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useFeatureGate } from "@/lib/hook/useFeatureGate";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { getVendors } from "@/lib/queries/vendor/getVendors";
import { getVendorStock } from "@/lib/queries/vendor/getVendorStock";
import { getVendorDashboardStats } from "@/lib/queries/vendor/getVendorDashboardStats";
import {
  getVendorSettlementsList,
} from "@/lib/queries/vendorSettlement/getVendorSettlements";
import { recordVendorSettlement } from "@/lib/queries/vendorSettlement/recordVendorSettlement";
import { deleteVendorSettlement } from "@/lib/queries/vendorSettlement/deleteVendorSettlement";
import { createVendorPayment } from "@/lib/queries/vendor/createVendorPayment";
import { getVendorInvoiceBalances } from "@/lib/queries/vendor/getVendorInvoiceBalances";
import VendorSettlementModal from "@/app/components/admin/dashboard/vendors/VendorSettlementModal";
import VendorQuickPaymentModal from "@/app/components/admin/dashboard/vendors/VendorQuickPaymentModal";
import FeatureLocked from "@/app/components/admin/common/FeatureLocked";
import type {
  Vendor,
  VendorStockRow,
  VendorDashboardStats,
  VendorSettlementListItem,
  VendorSettlementItemInput,
  VendorPaymentMethod,
} from "@/lib/types/vendor/type";

const PAGE_SIZE = 10;

const PAYMENT_METHOD_LABEL: Record<VendorPaymentMethod, string> = {
  cash: "Cash",
  cod: "COD",
  mobile_banking: "Mobile Banking",
  bank_transfer: "Bank Transfer",
  card: "Card",
  online: "Online",
};

export default function VendorSettlementsPage() {
  const { storeId, user, loading: userLoading } = useCurrentUser();
  const { loading: featureLoading, allowed } = useFeatureGate(storeId, "vendor_flow");
  const { success, error } = useSheiNotification();
  const router = useRouter();
  const { icon: currencyIcon } = useUserCurrencyIcon();
  const currencySymbol = typeof currencyIcon === "string" ? currencyIcon : "";
  const fmtMoney = useCallback(
    (v: number) => `${currencySymbol ? `${currencySymbol} ` : ""}${Number(v).toFixed(2)}`,
    [currencySymbol],
  );

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [settlements, setSettlements] = useState<VendorSettlementListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [settlementOpen, setSettlementOpen] = useState(false);
  const [settlementStock, setSettlementStock] = useState<VendorStockRow[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [quickPaymentOpen, setQuickPaymentOpen] = useState(false);
  const [quickPaymentSubmitting, setQuickPaymentSubmitting] = useState(false);
  const [deletingSettlementId, setDeletingSettlementId] = useState<string | null>(null);
  const [selectedVendorInvoices, setSelectedVendorInvoices] = useState<
    Awaited<ReturnType<typeof getVendorInvoiceBalances>>
  >([]);
  const [selectedVendorStats, setSelectedVendorStats] = useState<VendorDashboardStats | null>(
    null,
  );

  const refreshSelectedVendorStats = useCallback(() => {
    if (!selectedVendorId) return;
    getVendorDashboardStats(selectedVendorId).then(setSelectedVendorStats);
  }, [selectedVendorId]);

  useEffect(() => {
    if (!storeId) return;
    getVendors({ storeId, status: "active", pageSize: 1000 }).then((res) => setVendors(res.data));
  }, [storeId]);

  useEffect(() => {
    if (!selectedVendorId) {
      setSelectedVendorInvoices([]);
      setSelectedVendorStats(null);
      return;
    }
    getVendorInvoiceBalances(selectedVendorId).then(setSelectedVendorInvoices);
    getVendorDashboardStats(selectedVendorId).then(setSelectedVendorStats);
  }, [selectedVendorId]);

  const fetchSettlements = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const result = await getVendorSettlementsList({
        storeId,
        vendorId: selectedVendorId,
        page,
        pageSize: PAGE_SIZE,
      });
      setSettlements(result.data);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  }, [storeId, selectedVendorId, page]);

  useEffect(() => {
    fetchSettlements();
  }, [fetchSettlements]);

  const openSettlementModal = async () => {
    if (!selectedVendorId) return;
    setStockLoading(true);
    try {
      const stock = await getVendorStock(selectedVendorId);
      setSettlementStock(stock);
      setSettlementOpen(true);
    } finally {
      setStockLoading(false);
    }
  };

  const handleSettlementSubmit = async (payload: {
    settlementDate: string;
    items: VendorSettlementItemInput[];
    paymentAmount: number;
    paymentMethod: VendorPaymentMethod;
    notes?: string;
  }) => {
    if (!storeId || !selectedVendorId) return;
    if (payload.items.length === 0) {
      error("Enter sold or returned quantity for at least one product");
      return;
    }
    setSubmitting(true);
    try {
      await recordVendorSettlement({
        store_id: storeId,
        vendor_id: selectedVendorId,
        settlement_date: payload.settlementDate,
        items: payload.items,
        payment_amount: payload.paymentAmount,
        payment_method: payload.paymentMethod,
        notes: payload.notes,
        created_by: user?.id ?? null,
      });
      success("Settlement recorded");
      setSettlementOpen(false);
      fetchSettlements();
      getVendorInvoiceBalances(selectedVendorId).then(setSelectedVendorInvoices);
      refreshSelectedVendorStats();
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
    if (!storeId || !selectedVendorId) return;
    setQuickPaymentSubmitting(true);
    try {
      await createVendorPayment({
        store_id: storeId,
        vendor_id: selectedVendorId,
        amount: payload.amount,
        payment_date: payload.paymentDate,
        payment_method: payload.paymentMethod,
        notes: payload.notes,
        created_by: user?.id ?? null,
        vendor_order_id: payload.vendorOrderId,
      });
      success("Payment recorded");
      setQuickPaymentOpen(false);
      fetchSettlements();
      getVendorInvoiceBalances(selectedVendorId).then(setSelectedVendorInvoices);
      refreshSelectedVendorStats();
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setQuickPaymentSubmitting(false);
    }
  };

  const handleDeleteSettlement = async (settlementId: string) => {
    if (!storeId) return;
    setDeletingSettlementId(settlementId);
    try {
      await deleteVendorSettlement(settlementId, storeId, user?.id ?? null);
      success("Settlement deleted and stock reversed");
      fetchSettlements();
      if (selectedVendorId) {
        getVendorInvoiceBalances(selectedVendorId).then(setSelectedVendorInvoices);
      }
      refreshSelectedVendorStats();
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to delete settlement");
    } finally {
      setDeletingSettlementId(null);
    }
  };

  const columns: ColumnsType<VendorSettlementListItem> = [
    {
      title: "Date",
      dataIndex: "settlement_date",
      key: "settlement_date",
      width: 120,
      render: (d: string) => dayjs(d).format("DD MMM YYYY"),
    },
    {
      title: "Vendor",
      key: "vendor",
      render: (_, record) => record.vendor?.name ?? "—",
    },
    {
      title: "Sold Qty",
      key: "sold",
      width: 100,
      render: (_, record) =>
        (record.items ?? []).reduce((sum, i) => sum + i.sold_quantity, 0),
    },
    {
      title: "Returned Qty",
      key: "returned",
      width: 120,
      render: (_, record) =>
        (record.items ?? []).reduce((sum, i) => sum + i.returned_quantity, 0),
    },
    {
      title: "Receivable",
      dataIndex: "total_receivable",
      key: "total_receivable",
      width: 120,
      render: (v: number) => fmtMoney(v),
    },
    {
      title: "Payment",
      dataIndex: "total_payment",
      key: "total_payment",
      width: 120,
      render: (v: number) => (v > 0 ? fmtMoney(v) : "—"),
    },
    {
      title: "Method",
      key: "method",
      width: 130,
      render: (_, record) => {
        const method = record.payments?.[0]?.payment_method;
        return method ? (
          <Tag className="rounded-full">{PAYMENT_METHOD_LABEL[method]}</Tag>
        ) : (
          "—"
        );
      },
    },
    {
      title: "",
      key: "actions",
      width: 50,
      render: (_, record) => (
        <Popconfirm
          title="Delete this settlement? Stock it moved will be reversed."
          okText="Delete"
          okButtonProps={{ danger: true }}
          onConfirm={() => handleDeleteSettlement(record.id)}
        >
          <Button
            type="text"
            danger
            size="small"
            icon={<Trash2 size={14} />}
            loading={deletingSettlementId === record.id}
            onClick={(e) => e.stopPropagation()}
          />
        </Popconfirm>
      ),
    },
  ];

  if (userLoading || featureLoading) {
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
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border px-4 sm:px-8 py-4 sm:py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
              <HandCoins size={20} color="white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground m-0">Vendor Settlements</h1>
              <p className="text-xs text-muted-foreground m-0">
                Every sold/returned reconciliation and payment collected from vendors
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            showSearch
            placeholder="Select a vendor"
            value={selectedVendorId ?? undefined}
            onChange={(v) => {
              setSelectedVendorId(v ?? null);
              setPage(1);
            }}
            allowClear
            onClear={() => {
              setSelectedVendorId(null);
              setPage(1);
            }}
            filterOption={(input, option) =>
              (option?.label as string).toLowerCase().includes(input.toLowerCase())
            }
            options={vendors.map((v) => ({ value: v.id, label: v.name }))}
            className="w-full sm:w-64"
          />
          <Button
            icon={<Wallet size={16} />}
            disabled={!selectedVendorId}
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
            disabled={!selectedVendorId}
            loading={stockLoading}
            onClick={openSettlementModal}
            className="rounded-xl h-9 font-semibold border-none"
            style={{
              background: "linear-gradient(135deg, #10b981, #0d9488)",
              boxShadow: "0 4px 14px rgba(16,185,129,0.4)",
            }}
          >
            Record Settlement
          </Button>
        </div>

        {selectedVendorId && selectedVendorStats && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 -mt-1 px-1">
            <span className="text-xs text-muted-foreground">
              Current Due:{" "}
              <span className="font-semibold text-foreground">
                {fmtMoney(selectedVendorStats.current_due)}
              </span>
            </span>
            <span className="text-xs text-muted-foreground">
              Total Paid:{" "}
              <span className="font-semibold text-foreground">
                {fmtMoney(selectedVendorStats.total_paid)}
              </span>
            </span>
          </div>
        )}

        {selectedVendorId && (
          <p className="text-xs text-muted-foreground -mt-2">
            Only settlement visits are listed below — a payment recorded here still counts
            toward the vendor&apos;s balance, just visit their page for the full ledger.
          </p>
        )}

        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden overflow-x-auto">
          <Table
            columns={columns}
            dataSource={settlements}
            loading={loading}
            rowKey="id"
            pagination={false}
            locale={{ emptyText: "No settlements recorded yet" }}
            onRow={(record) => ({
              onClick: () => router.push(`/dashboard/vendors/${record.vendor_id}`),
              className: "cursor-pointer",
            })}
            scroll={{ x: 850 }}
          />
        </div>

        {total > PAGE_SIZE && (
          <div className="flex justify-end">
            <Pagination
              current={page}
              pageSize={PAGE_SIZE}
              total={total}
              onChange={setPage}
              showSizeChanger={false}
              size="small"
              showTotal={(t) => `${t} settlements`}
            />
          </div>
        )}
      </div>

      <VendorSettlementModal
        open={settlementOpen}
        stock={settlementStock}
        submitting={submitting}
        onSubmit={handleSettlementSubmit}
        onCancel={() => setSettlementOpen(false)}
      />

      <VendorQuickPaymentModal
        open={quickPaymentOpen}
        submitting={quickPaymentSubmitting}
        invoiceOptions={selectedVendorInvoices
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
