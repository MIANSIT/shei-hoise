"use client";

import React from "react";
import { Card, Typography } from "antd";
import { Order } from "@/lib/hook/useDashboardData";

const { Text } = Typography;

interface MobileOrderCardProps {
  order: Order;
  className?: string;
}

// Premium gradient colors for status
const statusStyles: Record<
  string,
  { bg: string; text: string; hoverBg: string }
> = {
  Completed: { bg: "bg-gradient-to-r from-emerald-400 to-emerald-600", text: "text-white", hoverBg: "hover:from-emerald-500 hover:to-emerald-700" },
  Pending: { bg: "bg-gradient-to-r from-amber-400 to-amber-600", text: "text-white", hoverBg: "hover:from-amber-500 hover:to-amber-700" },
  Shipped: { bg: "bg-gradient-to-r from-sky-400 to-sky-600", text: "text-white", hoverBg: "hover:from-sky-500 hover:to-sky-700" },
};

// Capitalize first letter
const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

const MobileOrderCard: React.FC<MobileOrderCardProps> = ({ order, className }) => {
  const style = statusStyles[capitalize(order.status)] || {
    bg: "bg-gray-300",
    text: "text-gray-900",
    hoverBg: "",
  };

  return (
    <Card className={`shadow-md rounded-xl hover:shadow-lg transition-all duration-300 p-4 ${className}`}>
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
        <div className="flex justify-between items-center">
          <Text strong>Status:</Text>
          <span
            className={`px-3 py-1 rounded-full font-semibold shadow-md transition-all duration-300 ${style.bg} ${style.text} ${style.hoverBg}`}
          >
            {capitalize(order.status)}
          </span>
        </div>
      </div>
    </Card>
  );
};

interface MobileOrdersListProps {
  orders: Order[];
}

export const MobileOrdersList: React.FC<MobileOrdersListProps> = ({ orders }) => {
  return (
    <div className="flex flex-col gap-4"> {/* gap-4 adds space between cards */}
      {orders.map((order) => (
        <MobileOrderCard key={order.id} order={order} />
      ))}
    </div>
  );
};
export default MobileOrderCard;