"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Alert, Spin, App } from "antd";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import dataService from "@/lib/queries/dataService";
import type { StoreOrder } from "@/lib/types/order";
import OrdersTable from "./OrdersTable";

const MainOrders: React.FC = () => {
  const { notification } = App.useApp();
  const { user, loading: userLoading } = useCurrentUser();

  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const fetchOrders = useCallback(
    async (pageNum = page, pageSizeNum = pageSize, searchTerm = search) => {
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
        setPage(pageNum);
        setPageSize(pageSizeNum);
      } catch (err: unknown) {
        let message = "Failed to load orders";
        if (err instanceof Error) message = err.message;
        console.error("Error fetching orders:", err);
        setError(message);
        notification.error({
          message: "Error Loading Orders",
          description: "Failed to load orders from the database.",
        });
      } finally {
        setLoading(false);
      }
    },
    [user?.store_id, page, pageSize, search, notification] // dependencies
  );

  useEffect(() => {
    if (!userLoading && user?.store_id) {
      fetchOrders();
    }
  }, [user?.store_id, userLoading, fetchOrders]);

  const handleSearch = (value: string) => {
    setSearch(value);
    fetchOrders(1, pageSize, value); // reset to page 1 on search
  };

  const handleTableChange = (pagination: {
    current: number;
    pageSize: number;
  }) => {
    fetchOrders(pagination.current, pagination.pageSize);
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
              onClick={() => fetchOrders()}
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
        search={search} // <- pass the latest search
        onSearchChange={handleSearch}
      />
    </div>
  );
};

export default MainOrders;
