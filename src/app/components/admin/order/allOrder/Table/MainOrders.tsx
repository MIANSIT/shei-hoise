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

  // URL-synced state for filters and pagination
  const [search, setSearch] = useUrlSync<string>("search", "", undefined, 500);
  const [page, setPage] = useUrlSync<number>("page", 1, parseInteger, 0); // 0 delay
  const [pageSize, setPageSize] = useUrlSync<number>(
    "pageSize",
    10,
    parseInteger,
    0
  ); // 0 delay
  const [statusFilter, setStatusFilter] = useUrlSync<string>(
    "status",
    "all",
    undefined,
    0
  ); // 0 delay
  const [paymentStatusFilter, setPaymentStatusFilter] = useUrlSync<string>(
    "payment_status",
    "all",
    undefined,
    0 // 0 delay
  );

  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Debug: Log URL parameters
  useEffect(() => {
    console.log("🔗 URL State Parameters:", {
      page,
      pageSize,
      statusFilter,
      paymentStatusFilter,
      search,
    });

    // Also log the actual browser URL
    const urlParams = new URLSearchParams(window.location.search);
    console.log("🌐 Actual Browser URL Parameters:", {
      page: urlParams.get("page"),
      pageSize: urlParams.get("pageSize"),
      status: urlParams.get("status"),
      payment_status: urlParams.get("payment_status"),
      search: urlParams.get("search"),
    });
  }, [page, pageSize, statusFilter, paymentStatusFilter, search]);
  // Fetch orders based on current URL state
  const fetchOrders = useCallback(
    async (
      pageNum: number,
      pageSizeNum: number,
      searchTerm: string,
      status: string,
      paymentStatus: string
    ) => {
      if (!user?.store_id) return;

      try {
        setLoading(true);
        setError(null);

        console.log("📞 Fetching orders with:", {
          pageNum,
          pageSizeNum,
          searchTerm,
          status,
          paymentStatus,
        });

        const filters: { status?: string; payment_status?: string } = {};
        if (status && status !== "all") filters.status = status;
        if (paymentStatus && paymentStatus !== "all")
          filters.payment_status = paymentStatus;

        console.log("🎯 Filters:", filters);

        const result = await dataService.getStoreOrders({
          storeId: user.store_id,
          page: pageNum,
          pageSize: pageSizeNum,
          search: searchTerm,
          filters,
        });

        console.log("✅ Orders received:", {
          count: result.orders.length,
          total: result.total,
          firstOrder: result.orders[0]?.order_number,
          page: pageNum,
        });

        setOrders(result.orders);
        setTotal(result.total);
      } catch (err: unknown) {
        console.error("❌ Error fetching orders:", err);
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

  // Refetch orders whenever URL-synced state changes
  useEffect(() => {
    console.log("🔄 useEffect triggered for fetchOrders");
    if (!userLoading && user?.store_id) {
      console.log("🚀 Calling fetchOrders...");
      fetchOrders(page, pageSize, search, statusFilter, paymentStatusFilter);
    }
  }, [
    userLoading,
    user?.store_id,
    page,
    pageSize,
    search,
    statusFilter,
    paymentStatusFilter,
    fetchOrders,
  ]);

  // Handlers
  const handleSearch = (value: string) => {
    console.log("🔍 Search changed:", value);
    setSearch(value);
    setPage(1);
  };

  const handleTableChange = (pagination: {
    current: number;
    pageSize: number;
  }) => {
    console.log("📄 Table pagination changed:", pagination);

    // Use a timeout to ensure both updates use the same base URL
    setTimeout(() => {
      // Get current URL params
      const params = new URLSearchParams(window.location.search);

      // Update both params
      params.set("page", pagination.current.toString());
      params.set("pageSize", pagination.pageSize.toString());

      // Create new URL
      const newUrl = `${window.location.pathname}?${params.toString()}`;

      // Update URL directly
      window.history.replaceState({}, "", newUrl);
      console.log("🔗 Direct URL update:", newUrl);

      // Update React state
      setPage(pagination.current);
      setPageSize(pagination.pageSize);

      // Force fetch with new values
      fetchOrders(
        pagination.current,
        pagination.pageSize,
        search,
        statusFilter,
        paymentStatusFilter
      );
    }, 0);
  };

  const handleStatusChange = (status: string) => {
    console.log("🏷️ Status changed:", status);
    setStatusFilter(status);
    setPage(1);
  };

  const handlePaymentStatusChange = (status: string) => {
    console.log("💰 Payment status changed:", status);
    setPaymentStatusFilter(status);
    setPage(1);
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
      </div>

      <OrdersTable
        orders={orders}
        total={total}
        page={page}
        pageSize={pageSize}
        onTableChange={handleTableChange}
        onUpdate={(id, changes) =>
          setOrders((prev) =>
            prev.map((o) => (o.id === id ? { ...o, ...changes } : o))
          )
        }
        loading={loading}
        search={search}
        onSearchChange={handleSearch}
        onStatusChange={handleStatusChange} // pass status setter
        onPaymentStatusChange={handlePaymentStatusChange} // pass payment status setter
      />
    </div>
  );
};

export default MainOrders;
