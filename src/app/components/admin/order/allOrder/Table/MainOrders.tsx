"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Alert, Spin, App } from "antd";
import { ShoppingCart, Clock, PackageCheck, Zap } from "lucide-react";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import dataService from "@/lib/queries/dataService";
import type { StoreOrder } from "@/lib/types/order";
import OrdersTable from "./OrdersTable";
import { useUrlSync, parseInteger } from "@/lib/hook/filterWithUrl/useUrlSync";
import { useTranslation } from "@/lib/hook/useTranslation";
import type { RiskAssessment } from "@/lib/utils/riskScoring";
import { getMonthlyOrderUsage, type MonthlyOrderUsage } from "@/lib/queries/orders/getMonthlyOrderUsage";
import type { CustomerHistoryEntry } from "@/lib/types/orders/customerHistory";
import { getCustomerPaymentsSummaryByOrderIds } from "@/lib/queries/customers/getCustomerPaymentsSummaryByOrderIds";
import { VendorStatCard } from "@/app/components/admin/dashboard/vendors/VendorStatCard";
import { OrderStatus, PaymentStatus } from "@/lib/types/enums";

const MainOrders: React.FC = () => {
  const { notification } = App.useApp();
  const notificationRef = useRef(notification);
  useEffect(() => { notificationRef.current = notification; }, [notification]);
  const t = useTranslation();
  const { user, loading: userLoading } = useCurrentUser();

  const [search, setSearch] = useUrlSync<string>("search", "", undefined, 500);
  const [page, setPage] = useUrlSync<number>("page", 1, parseInteger, 0);
  const [pageSize, setPageSize] = useUrlSync<number>(
    "pageSize",
    10,
    parseInteger,
    0
  );
  const [category, setCategory] = useUrlSync<"order" | "payment">(
    "category",
    "order"
  );
  const [statusFilter, setStatusFilter] = useUrlSync<string>(
    "status",
    "all",
    undefined,
    0
  );
  const [paymentStatusFilter, setPaymentStatusFilter] = useUrlSync<string>(
    "payment_status",
    "all",
    undefined,
    0
  );
  const [channelFilter, setChannelFilter] = useUrlSync<"all" | "online" | "pos">(
    "channel",
    "all",
    (v) => (v === "online" || v === "pos" ? v : "all"),
    0
  );

  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [riskByPhone, setRiskByPhone] = useState<Record<string, RiskAssessment>>({});
  const [historyByPhone, setHistoryByPhone] = useState<
    Record<string, CustomerHistoryEntry[]>
  >({});
  const [paidAmountByOrderId, setPaidAmountByOrderId] = useState<Record<string, number>>({});
  const [monthlyUsage, setMonthlyUsage] = useState<MonthlyOrderUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalByOrderStatus, setTotalByOrderStatus] = useState<
    Record<string, number>
  >({});
  const [totalByPaymentStatus, setTotalByPaymentStatus] = useState<
    Record<string, number>
  >({});
  const [totalByChannel, setTotalByChannel] = useState<{ online: number; pos: number }>({
    online: 0,
    pos: 0,
  });

  // ✅ ADD: refresh trigger state
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchOrders = useCallback(
    async (
      pageNum: number,
      pageSizeNum: number,
      searchTerm: string,
      category: "order" | "payment",
      status: string,
      paymentStatus: string,
      channel: "all" | "online" | "pos"
    ) => {
      if (!user?.store_id) return;
      try {
        setLoading(true);
        setError(null);

        const filters: { status?: string; payment_status?: string; channel?: "online" | "pos" } =
          {};
        if (category === "order" && status && status !== "all")
          filters.status = status;
        else if (
          category === "payment" &&
          paymentStatus &&
          paymentStatus !== "all"
        )
          filters.payment_status = paymentStatus;
        if (channel !== "all") filters.channel = channel;

        const result = await dataService.getStoreOrders({
          storeId: user.store_id,
          page: pageNum,
          pageSize: pageSizeNum,
          search: searchTerm,
          filters,
        });

        setOrders(result.orders);
        setTotal(result.total);
        setTotalOrders(result.totalOrders);
        setTotalByOrderStatus(result.totalByOrderStatus);
        setTotalByPaymentStatus(result.totalByPaymentStatus);
        setTotalByChannel(result.totalByChannel);

        // How much of each order on this page has an advance/partial
        // payment recorded against it (fire-and-forget, same pattern as the
        // risk/history lookups below) — powers the "Advance" hint in the
        // table and the Paid/Due lines on the invoice.
        getCustomerPaymentsSummaryByOrderIds(result.orders.map((o) => o.id))
          .then(setPaidAmountByOrderId)
          .catch(() => {});

        // Fetch COD fake-order risk levels for the phones on this page (fire-and-forget)
        const phones = result.orders
          .map((o) => o.shipping_address?.phone)
          .filter((p): p is string => !!p);
        if (phones.length > 0) {
          fetch("/api/orders/risk-levels", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phones }),
          })
            .then((res) => (res.ok ? res.json() : {}))
            .then((data) => setRiskByPhone(data))
            .catch(() => {});

          // Prior order history for the same phones — also fire-and-forget, so
          // a slow or failed lookup never blocks the orders table itself.
          fetch("/api/orders/customer-history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ storeId: user?.store_id, phones }),
          })
            .then((res) => (res.ok ? res.json() : {}))
            .then((data) => setHistoryByPhone(data))
            .catch(() => {});
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : t.admin.allOrdersLoadFailed;
        setError(message);
        notificationRef.current.error({
          message: t.admin.allOrdersErrorTitle,
          description: message,
        });
      } finally {
        setLoading(false);
      }
    },
    [user?.store_id]
  );

  // ✅ ADD: refresh function
  const handleRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Fetches every order matching the current search/status/payment filters —
  // not just the currently loaded page — so CSV export covers the full result
  // set (further narrowed by date range client-side), not only what's on screen.
  const handleExportOrders = useCallback(async (): Promise<StoreOrder[]> => {
    if (!user?.store_id) return [];

    const filters: { status?: string; payment_status?: string; channel?: "online" | "pos" } = {};
    if (category === "order" && statusFilter && statusFilter !== "all")
      filters.status = statusFilter;
    else if (
      category === "payment" &&
      paymentStatusFilter &&
      paymentStatusFilter !== "all"
    )
      filters.payment_status = paymentStatusFilter;
    if (channelFilter !== "all") filters.channel = channelFilter;

    const result = await dataService.getStoreOrders({
      storeId: user.store_id,
      page: 1,
      pageSize: 1_000_000,
      search,
      filters,
    });

    return result.orders;
  }, [user?.store_id, search, category, statusFilter, paymentStatusFilter, channelFilter]);

  useEffect(() => {
    if (!user?.store_id) return;
    getMonthlyOrderUsage(user.store_id).then(setMonthlyUsage);
  }, [user?.store_id, refreshTrigger]);

  useEffect(() => {
    if (!userLoading && user?.store_id) {
      fetchOrders(
        page,
        pageSize,
        search,
        category,
        statusFilter,
        paymentStatusFilter,
        channelFilter
      );
    }
  }, [
    userLoading,
    user?.store_id,
    page,
    pageSize,
    search,
    category,
    statusFilter,
    paymentStatusFilter,
    channelFilter,
    fetchOrders,
    refreshTrigger, // ✅ ADD: refresh trigger dependency
  ]);

  const handleUpdate = useCallback(
    (id: string, changes: Partial<StoreOrder>) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, ...changes } : o))
      );
    },
    []
  );

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleTableChange = (pagination: {
    current: number;
    pageSize: number;
  }) => {
    setPage(pagination.current);
    setPageSize(pagination.pageSize);
  };

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    setCategory("order");
    setPage(1);
  };

  const handlePaymentStatusChange = (status: string) => {
    setPaymentStatusFilter(status);
    setCategory("payment");
    setPage(1);
  };

  const handleChannelChange = (channel: "all" | "online" | "pos") => {
    setChannelFilter(channel);
    setPage(1);
  };

  const getInitialCategory = () => {
    if (typeof window === "undefined") return "order";
    const params = new URLSearchParams(window.location.search);
    return params.get("category") === "payment" ? "payment" : "order";
  };

  const getInitialStatus = () => {
    if (typeof window === "undefined") return "all";
    const params = new URLSearchParams(window.location.search);
    const currentCategory = getInitialCategory();
    return currentCategory === "order"
      ? params.get("status") || "all"
      : params.get("payment_status") || "all";
  };

  if (userLoading)
    return (
      <div className="flex justify-center items-center min-h-64">
        <Spin size="large" />
      </div>
    );
  if (error)
    return (
      <div className="p-4 sm:p-6">
        <Alert
          title={t.admin.allOrdersErrorTitle}
          description={error}
          type="error"
          showIcon
          action={
            <button
              onClick={() =>
                fetchOrders(
                  page,
                  pageSize,
                  search,
                  category,
                  statusFilter,
                  paymentStatusFilter,
                  channelFilter
                )
              }
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              {t.admin.allOrdersTryAgain}
            </button>
          }
        />
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border px-4 sm:px-8 py-4 sm:py-5">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-blue-400 to-indigo-600 flex items-center justify-center shrink-0">
              <ShoppingCart size={18} color="white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground m-0 tracking-tight leading-tight">
                {t.admin.allOrdersTitle}
              </h1>
              <p className="text-xs text-muted-foreground m-0">
                {t.admin.allOrdersDesc}
              </p>
            </div>
          </div>
          {monthlyUsage && monthlyUsage.limit !== -1 && (
            <div
              className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                monthlyUsage.current > monthlyUsage.limit
                  ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
              }`}
              title={
                monthlyUsage.current > monthlyUsage.limit
                  ? t.admin.allOrdersMonthlyLimitExceeded
                  : t.admin.allOrdersMonthlyLimitInfo
              }
            >
              {monthlyUsage.current}/{monthlyUsage.limit} {t.admin.allOrdersMonthlyLimitLabel}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-8 py-6 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <VendorStatCard
            icon={<ShoppingCart size={18} />}
            label="Total Orders"
            value={String(totalOrders)}
            tone="indigo"
          />
          <VendorStatCard
            icon={<Clock size={18} />}
            label="Payment Pending"
            value={String(totalByPaymentStatus[PaymentStatus.PENDING] ?? 0)}
            tone="amber"
          />
          <VendorStatCard
            icon={<PackageCheck size={18} />}
            label="Delivered"
            value={String(totalByOrderStatus[OrderStatus.DELIVERED] ?? 0)}
            tone="emerald"
          />
          <VendorStatCard
            icon={<Zap size={18} />}
            label="Quick Sale"
            value={String(totalByChannel.pos)}
            hint={`${totalByChannel.online} online`}
            tone="sky"
          />
        </div>

      <OrdersTable
        orders={orders}
        paidAmountByOrderId={paidAmountByOrderId}
        riskByPhone={riskByPhone}
        historyByPhone={historyByPhone}
        total={total}
        totalOrders={totalOrders}
        totalByOrderStatus={totalByOrderStatus}
        totalByPaymentStatus={totalByPaymentStatus}
        totalByChannel={totalByChannel}
        channelFilter={channelFilter}
        onChannelChange={handleChannelChange}
        page={page}
        pageSize={pageSize}
        onTableChange={handleTableChange}
        onUpdate={handleUpdate} // ✅ Use the new update handler
        loading={loading}
        search={search}
        onSearchChange={handleSearch}
        onStatusChange={handleStatusChange}
        onPaymentStatusChange={handlePaymentStatusChange}
        initialCategory={getInitialCategory()}
        initialStatus={getInitialStatus()}
        // ✅ PASS the refresh function
        onRefresh={handleRefresh}
        onExportOrders={handleExportOrders}
      />
      </div>
    </div>
  );
};

export default MainOrders;
