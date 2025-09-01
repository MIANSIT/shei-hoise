"use client";

import React, { useState } from "react";
import { Order } from "../../../../../lib/types/types";
import { initialOrders } from "@/lib/store/orderData";
import OrdersTable from "./OrdersTable";

const MainOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>(initialOrders);

  const updateOrder = (orderId: number, changes: Partial<Order>) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, ...changes } : o))
    );
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">All Orders</h2>
      {/* OrdersTable now has search/filter built-in */}
      <OrdersTable orders={orders} onUpdate={updateOrder} />
    </div>
  );
};

export default MainOrders;
