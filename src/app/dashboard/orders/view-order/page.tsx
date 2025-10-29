"use client";

import React from "react";
import MainOrders from "@/app/components/admin/order/allOrder/Table/MainOrders";

const OrdersPage: React.FC = () => {
  return (
    <div className="min-h-screen">
      <MainOrders />
    </div>
  );
};

export default OrdersPage;