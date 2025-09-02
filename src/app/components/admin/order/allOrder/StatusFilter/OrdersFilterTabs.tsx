"use client";

import React, { useState } from "react";
import { Tabs, Input } from "antd";
import { Order } from "@/lib/types/types";

interface Props {
  orders: Order[];
  onFilter: (filteredOrders: Order[]) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
}

// Color mapping for status
const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const OrdersFilterTabs: React.FC<Props> = ({
  orders,
  onFilter,
  searchValue,
  onSearchChange,
}) => {
  const [category, setCategory] = useState<"order" | "payment">("order");
  const [activeStatus, setActiveStatus] = useState<string>("all");

  const orderStatuses = [
    "all",
    "pending",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ];
  const paymentStatuses = ["all", "paid", "pending", "failed"];

  const handleCategoryChange = (key: string) => {
    setCategory(key as "order" | "payment");
    setActiveStatus("all");
    onFilter(orders);
  };

  const handleStatusChange = (status: string) => {
    setActiveStatus(status);
    const filtered =
      status === "all"
        ? orders
        : category === "order"
        ? orders.filter((o) => o.status === status)
        : orders.filter((o) => o.paymentStatus === status);

    // Apply search filter
    const finalFiltered = filtered.filter((o) =>
      o.id.toString().includes(searchValue)
    );
    onFilter(finalFiltered);
  };

  const statuses = category === "order" ? orderStatuses : paymentStatuses;

  return (
    <div className="mb-4">
      {/* Category tabs on top */}
      <Tabs
        activeKey={category}
        onChange={handleCategoryChange}
        items={[
          { key: "order", label: "Order" },
          { key: "payment", label: "Payment" },
        ]}
        type="card"
      />

      {/* Search input left, status buttons right */}
      <div className="flex justify-between items-center mt-2">
        {/* Search input */}
        <Input
          placeholder="Search by Order ID"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{ width: 250 }}
          allowClear
        />

        {/* Status buttons */}
        <div className="flex flex-wrap gap-2">
          {statuses.map((status) => {
            const isActive = activeStatus === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => handleStatusChange(status)}
                aria-pressed={isActive}
                className={`px-2 py-0.5 text-sm rounded-full font-medium transition-all duration-200
                  ${statusColors[status] || "bg-gray-100 text-gray-800"}
                  ${isActive ? "ring-2 ring-offset-1 ring-blue-500" : "hover:scale-105"}
                `}
              >
                {capitalize(status)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OrdersFilterTabs;
