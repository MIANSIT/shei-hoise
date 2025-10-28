/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { Alert, Spin, App } from "antd";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import dataService from "@/lib/queries/dataService";
import type { StoreOrder } from "@/lib/types/order";
import OrdersTable from "./OrdersTable";

const MainOrders: React.FC = () => {
  const { notification } = App.useApp();
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: userLoading } = useCurrentUser();

  const fetchOrders = async () => {
    if (!user?.store_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const storeOrders = await dataService.getStoreOrders(user.store_id);
      setOrders(storeOrders);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setError(err.message || 'Failed to load orders');
      notification.error({
        message: 'Error Loading Orders',
        description: 'Failed to load orders from the database.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userLoading && user?.store_id) {
      fetchOrders();
    }
  }, [user?.store_id, userLoading]);

  const updateOrder = (orderId: string, changes: Partial<StoreOrder>) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, ...changes } : o))
    );
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
      <div className="p-6">
        <Alert
          message="Error Loading Orders"
          description={error}
          type="error"
          showIcon
          action={
            <button 
              onClick={fetchOrders}
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
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">All Orders</h2>
        <p className="text-gray-600 mt-1">
          Manage and track your store orders
        </p>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center min-h-64">
          <Spin size="large" />
        </div>
      ) : (
        <OrdersTable 
          orders={orders} 
          onUpdate={updateOrder}
          onRefresh={fetchOrders}
          loading={loading}
        />
      )}
    </div>
  );
};

export default MainOrders;