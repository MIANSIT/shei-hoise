"use client";

import React from "react";
import { Card, Typography } from "antd";
import { Order } from "@/lib/hook/useDashboardData";

const { Text } = Typography;

interface MobileOrderCardProps {
  order: Order;
    className?: string;
}

const colorMap: Record<string, string> = {
  Completed: "green",
  Pending: "orange",
  Shipped: "blue",
};

const MobileOrderCard: React.FC<MobileOrderCardProps> = ({ order, className }) => (
  <Card className={`shadow-sm rounded-xl hover:shadow-lg transition-all duration-300 p-4 ${className}`}>
    <div className="flex flex-col gap-2">
      <div className="flex justify-between">
        <Text strong>Order ID:</Text>
        <Text>{order.id}</Text>
      </div>
      <div className="flex justify-between">
        <Text strong>Customer:</Text>
        <Text>{order.customer}</Text>
      </div>
      <div className="flex justify-between">
        <Text strong>Total:</Text>
        <Text>{order.total}</Text>
      </div>
      <div className="flex justify-between">
        <Text strong>Status:</Text>
        <Text style={{ color: colorMap[order.status], fontWeight: 500 }}>
          {order.status}
        </Text>
      </div>
    </div>
  </Card>
);

export default MobileOrderCard;
