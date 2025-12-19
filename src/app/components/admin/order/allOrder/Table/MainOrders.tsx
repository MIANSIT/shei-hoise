"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Alert, Spin, App } from "antd";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import dataService from "@/lib/queries/dataService";
import type { StoreOrder } from "@/lib/types/order";
import OrdersTable from "./OrdersTable";
import { useUrlSync, parseInteger } from "@/lib/hook/filterWithUrl/useUrlSync";

const MainOrders: React.FC = () => {
  const { notification } = App.useApp();
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
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load orders";
        setError(message);
        notification.error({
          message: "Error Loading Orders",
          description: message,
        });
      } finally {
        setLoading(false);
      }
    },
    [user?.store_id, notification]
  );

  // ✅ ADD: refresh function
  const handleRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

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

  // ✅ ADD: update handler that also triggers refresh
  const handleUpdate = useCallback(
    (id: string, changes: Partial<StoreOrder>) => {
      // Update local state immediately for better UX
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, ...changes } : o))
      );

      // Also trigger a refresh to get updated counts
      handleRefresh();
    },
    [handleRefresh]
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
          message="Error Loading Orders"
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
              Try Again
            </button>
          }
        />
      </div>
    );

  return (
    <div className="p-3 sm:p-4 md:p-6">
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            All Orders
          </h2>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Manage and track your store orders
          </p>
        </div>
        {/* ✅ ADD: Refresh button for manual refresh */}
      </div>

      <OrdersTable
        orders={orders}
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
