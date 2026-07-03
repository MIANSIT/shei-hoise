"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Alert, Spin, App } from "antd";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import dataService from "@/lib/queries/dataService";
import type { StoreOrder } from "@/lib/types/order";
import OrdersTable from "./OrdersTable";
import { useUrlSync, parseInteger } from "@/lib/hook/filterWithUrl/useUrlSync";
import { useTranslation } from "@/lib/hook/useTranslation";
import type { RiskAssessment } from "@/lib/utils/riskScoring";
import { getMonthlyOrderUsage, type MonthlyOrderUsage } from "@/lib/queries/orders/getMonthlyOrderUsage";

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

  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [riskByPhone, setRiskByPhone] = useState<Record<string, RiskAssessment>>({});
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

  // ✅ ADD: refresh trigger state
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchOrders = useCallback(
    async (
      pageNum: number,
      pageSizeNum: number,
      searchTerm: string,
      category: "order" | "payment",
      status: string,
      paymentStatus: string
    ) => {
      if (!user?.store_id) return;
      try {
        setLoading(true);
        setError(null);

        const filters: { status?: string; payment_status?: string } = {};
        if (category === "order" && status && status !== "all")
          filters.status = status;
        else if (
          category === "payment" &&
          paymentStatus &&
          paymentStatus !== "all"
        )
          filters.payment_status = paymentStatus;

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
        paymentStatusFilter
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
                  paymentStatusFilter
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
    <div className="">
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold ">
            {t.admin.allOrdersTitle}
          </h2>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            {t.admin.allOrdersDesc}
          </p>
        </div>
        {/* ✅ ADD: Refresh button for manual refresh */}
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

      <OrdersTable
        orders={orders}
        riskByPhone={riskByPhone}
        total={total}
        totalOrders={totalOrders}
        totalByOrderStatus={totalByOrderStatus}
        totalByPaymentStatus={totalByPaymentStatus}
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
      />
    </div>
  );
};

export default MainOrders;
