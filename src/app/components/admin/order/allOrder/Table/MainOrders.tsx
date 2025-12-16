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

  // Sync state with URL
  const [search, setSearch] = useUrlSync<string>("search", "", undefined, 500);
  const [page, setPage] = useUrlSync<number>("page", 1, parseInteger);
  const [pageSize, setPageSize] = useUrlSync<number>(
    "pageSize",
    10,
    parseInteger
  );

  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchOrders = useCallback(
    async (pageNum: number, pageSizeNum: number, searchTerm: string) => {
      if (!user?.store_id) return;

      try {
        setLoading(true);
        setError(null);

        const { orders: storeOrders, total } = await dataService.getStoreOrders(
          {
            storeId: user.store_id,
            page: pageNum,
            pageSize: pageSizeNum,
            search: searchTerm,
          }
        );

        setOrders(storeOrders);
        setTotal(total);
        // ❌ REMOVE setPage / setPageSize here
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

  // ✅ UseEffect now includes fetchOrders
  useEffect(() => {
    if (!userLoading && user?.store_id) {
      fetchOrders(page, pageSize, search); // fetch automatically when these change
    }
  }, [userLoading, user?.store_id, page, pageSize, search, fetchOrders]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1); // reset page on new search
    // ✅ Again, useEffect will handle fetching
  };

  const handleTableChange = (pagination: {
    current: number;
    pageSize: number;
  }) => {
    setPage(pagination.current);
    setPageSize(pagination.pageSize);
    // ✅ No need to call fetchOrders manually; useEffect will handle it
  };

  if (userLoading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <Alert
          message="Error Loading Orders"
          description={error}
          type="error"
          showIcon
          action={
            <button
              onClick={() => fetchOrders(page, pageSize, search)} // Pass all 3 arguments
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Try Again
            </button>
          }
        />
      </div>
    );
  }

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
      />
    </div>
  );
};

export default MainOrders;
