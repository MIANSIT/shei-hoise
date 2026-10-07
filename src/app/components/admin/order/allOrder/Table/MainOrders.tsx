"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Alert, Spin, App, Button, Segmented } from "antd";
import { ShoppingCart, Clock, Truck, Zap, Printer, Wallet, Plus } from "lucide-react";
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
import { OrderStatus, PaymentStatus } from "@/lib/types/enums";
import { usePermissions } from "@/lib/context/PermissionsContext";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { useBranches } from "@/lib/context/BranchContext";
import type { GetStoreOrdersOptions } from "@/lib/queries/orders/getStoreOrders";

const TODO_TONES = {
  amber: { icon: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400", ring: "ring-amber-400" },
  sky: { icon: "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400", ring: "ring-sky-400" },
  rose: { icon: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400", ring: "ring-rose-400" },
  indigo: { icon: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400", ring: "ring-indigo-400" },
} as const;

const parsePhoneParam = (value: string | null): string => (value && /^\+?\d{7,15}$/.test(value.trim()) ? value.trim() : "");

const parseDateParam = (value: string | null): string =>
  value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";

const MainOrders: React.FC = () => {
  const { notification } = App.useApp();
  const notificationRef = useRef(notification);
  useEffect(() => { notificationRef.current = notification; }, [notification]);
  const t = useTranslation();
  const n = useLocalNum();
  const { can } = usePermissions();
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

  // Stores with branches: the header's branch picker scopes the list, and
  // "Needs a branch" shows orders waiting for someone to confirm or fix theirs.
  const { enabled: branchesOn, selectedBranchId, branches, canSeeAllBranches } = useBranches();
  const [needsBranchOnly, setNeedsBranchOnly] = useUrlSync<boolean>(
    "needs_branch",
    false,
    (v) => v === "true",
    0
  );
  const branchIdsKey = !branchesOn
    ? ""
    : selectedBranchId
      ? selectedBranchId
      : canSeeAllBranches
        ? ""
        : branches.map((b) => b.id).join(",");
  // "Not printed": orders whose invoice hasn't been printed yet — today's
  // batch to print, without the ones already printed.
  const [notPrintedOnly, setNotPrintedOnly] = useUrlSync<boolean>(
    "not_printed",
    false,
    (v) => v === "true",
    0
  );
  // Order-date range (YYYY-MM-DD) — filters the list and the CSV/Excel export.
  const [dateFrom, setDateFrom] = useUrlSync<string>("from", "", parseDateParam, 0);
  const [dateTo, setDateTo] = useUrlSync<string>("to", "", parseDateParam, 0);
  // From the Customers / Customer Dues pages: one customer's orders (or only
  // the ones they still owe for), found by phone number. Kept in the URL so a
  // reload, the Back button and a shared link keep the filter; no internal id
  // is ever shown.
  const [customerPhone, setCustomerPhone] = useUrlSync<string>("phone", "", parsePhoneParam, 0);
  const [dueOnly, setDueOnly] = useUrlSync<boolean>("due", false, (v) => v === "true", 0);
  const branchFilters = React.useMemo<NonNullable<GetStoreOrdersOptions["filters"]>>(
    () => ({
      ...(customerPhone ? { customerPhone } : {}),
      ...(customerPhone && dueOnly ? { dueOnly: true } : {}),
      ...(dateFrom && dateTo ? { dateFrom, dateTo } : {}),
      ...(branchIdsKey ? { branchIds: branchIdsKey.split(",") } : {}),
      ...(branchesOn && needsBranchOnly ? { needsBranch: true } : {}),
      ...(notPrintedOnly ? { printed: "no" as const } : {}),
    }),
    [branchIdsKey, branchesOn, needsBranchOnly, notPrintedOnly, dateFrom, dateTo, customerPhone, dueOnly]
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
  const [totalNotPrinted, setTotalNotPrinted] = useState<number | null>(null);

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

        const filters: NonNullable<GetStoreOrdersOptions["filters"]> = { ...branchFilters };
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
        setTotalNotPrinted(result.totalNotPrinted);

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
    [user?.store_id, branchFilters]
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

    const filters: NonNullable<GetStoreOrdersOptions["filters"]> = { ...branchFilters };
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
  }, [user?.store_id, search, category, statusFilter, paymentStatusFilter, channelFilter, branchFilters]);

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

  const handleDateRangeChange = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
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
                {t.admin.menuAllOrders}
              </h1>
              <p className="text-xs text-muted-foreground m-0">
                {t.admin.allOrdersDesc}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
          {can("orders.add") && (
            <Link href="/dashboard/orders/create-order">
              <Button type="primary" icon={<Plus size={15} />}>
                {t.admin.ordersNewOrder}
              </Button>
            </Link>
          )}
          {can("pos.add") && (
            <Link href="/dashboard/orders/quick-sale">
              <Button icon={<Zap size={15} />}>{t.admin.menuQuickSale}</Button>
            </Link>
          )}
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
      </div>

      <div className="px-4 sm:px-8 py-6 space-y-5">
        {customerPhone && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 dark:border-indigo-500/30 dark:bg-indigo-500/10">
            <div className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">
              {(dueOnly ? t.admin.ordersOfCustomerDue : t.admin.ordersOfCustomer).replace(
                "{name}",
                orders[0]?.shipping_address?.customer_name || t.admin.ordersThisCustomer,
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setCustomerPhone("");
                setDueOnly(false);
                setPage(1);
              }}
              className="text-xs font-semibold text-indigo-700 hover:underline dark:text-indigo-300"
            >
              {t.admin.ordersShowAll}
            </button>
          </div>
        )}

        {/* What needs doing — each card is a one-tap filter. */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(
            [
              {
                key: "confirm",
                label: t.admin.ordersToConfirm,
                hint: t.admin.ordersToConfirmHint,
                value: totalByOrderStatus[OrderStatus.PENDING] ?? 0,
                icon: <Clock size={18} />,
                tone: "amber",
                active: category === "order" && statusFilter === OrderStatus.PENDING,
                onClick: () => handleStatusChange(statusFilter === OrderStatus.PENDING && category === "order" ? "all" : OrderStatus.PENDING),
              },
              {
                key: "ship",
                label: t.admin.ordersToShip,
                hint: t.admin.ordersToShipHint,
                value: totalByOrderStatus[OrderStatus.CONFIRMED] ?? 0,
                icon: <Truck size={18} />,
                tone: "sky",
                active: category === "order" && statusFilter === OrderStatus.CONFIRMED,
                onClick: () => handleStatusChange(statusFilter === OrderStatus.CONFIRMED && category === "order" ? "all" : OrderStatus.CONFIRMED),
              },
              {
                key: "payment",
                label: t.admin.ordersPaymentPending,
                hint: t.admin.ordersPaymentPendingHint,
                value: totalByPaymentStatus[PaymentStatus.PENDING] ?? 0,
                icon: <Wallet size={18} />,
                tone: "rose",
                active: category === "payment" && paymentStatusFilter === PaymentStatus.PENDING,
                onClick: () =>
                  category === "payment" && paymentStatusFilter === PaymentStatus.PENDING
                    ? handleStatusChange("all")
                    : handlePaymentStatusChange(PaymentStatus.PENDING),
              },
              {
                key: "print",
                label: t.admin.notPrintedFilter,
                hint: t.admin.notPrintedHint,
                value: totalNotPrinted,
                icon: <Printer size={18} />,
                tone: "indigo",
                active: notPrintedOnly,
                onClick: () => {
                  setNotPrintedOnly(!notPrintedOnly);
                  setPage(1);
                },
              },
            ] as const
          ).map((card) => (
            <button
              key={card.key}
              type="button"
              aria-pressed={card.active}
              title={card.hint}
              onClick={card.onClick}
              className={`flex items-center gap-3 rounded-2xl border bg-card p-3 text-left transition-all hover:shadow-md ${
                card.active ? `ring-2 ${TODO_TONES[card.tone].ring} border-transparent` : "border-border"
              }`}
            >
              <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TODO_TONES[card.tone].icon}`}>
                {card.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-2xl font-black leading-none tabular-nums text-foreground">
                  {card.value === null ? "—" : n(card.value)}
                </span>
                <span className="mt-1 block truncate text-xs font-semibold text-muted-foreground">{card.label}</span>
              </span>
            </button>
          ))}
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
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateRangeChange={handleDateRangeChange}
        filterExtras={
          <>
          <Segmented
            size="small"
            value={channelFilter}
            onChange={(v) => handleChannelChange(v as "all" | "online" | "pos")}
            options={[
              { value: "all", label: `${t.admin.ordersAllChannels} ${n(totalByChannel.online + totalByChannel.pos)}` },
              { value: "online", label: `${t.admin.ordersOnline} ${n(totalByChannel.online)}` },
              { value: "pos", label: `${t.admin.menuQuickSale} ${n(totalByChannel.pos)}` },
            ]}
          />
          {branchesOn && (
            <button
              type="button"
              aria-pressed={needsBranchOnly}
              title={t.branches.needsBranchHint}
              onClick={() => {
                setNeedsBranchOnly(!needsBranchOnly);
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                needsBranchOnly
                  ? "border-amber-500 bg-amber-500 text-white"
                  : "border-border bg-card text-muted-foreground hover:border-amber-400 hover:text-amber-600"
              }`}
            >
              {t.branches.needsBranchFilter}
            </button>
          )}
          {(notPrintedOnly || needsBranchOnly || channelFilter !== "all" || statusFilter !== "all" || paymentStatusFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setNotPrintedOnly(false);
                setNeedsBranchOnly(false);
                handleChannelChange("all");
                setPaymentStatusFilter("all");
                handleStatusChange("all");
              }}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline px-1"
            >
              {t.admin.ordersClearFilters}
            </button>
          )}
          </>
        }
      />
      </div>
    </div>
  );
};

export default MainOrders;
