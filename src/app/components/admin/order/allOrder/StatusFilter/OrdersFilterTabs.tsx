"use client";

import React, { useState, useEffect } from "react";
import { Tabs, Input } from "antd";
import { StoreOrder } from "@/lib/types/order";

interface Props {
  orders: StoreOrder[];
  onFilter: (filteredOrders: StoreOrder[]) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
}

// ✅ Color mapping for statuses
const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  shipped: "bg-purple-100 text-purple-800 border-purple-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  paid: "bg-green-100 text-green-800 border-green-200",
  failed: "bg-red-100 text-red-800 border-red-200",
  refunded: "bg-orange-100 text-orange-800 border-orange-200",
  all: "bg-gray-100 text-gray-800 border-gray-200",
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
    "confirmed",
    "shipped",
    "delivered",
    "cancelled",
  ];
  const paymentStatuses = ["all", "paid", "pending", "failed", "refunded"];

  useEffect(() => {
    handleStatusChange(activeStatus);
  }, [category, orders]);

  const handleCategoryChange = (key: string) => {
    setCategory(key as "order" | "payment");
    setActiveStatus("all");
  };

  const handleStatusChange = (status: string) => {
    setActiveStatus(status);

    let filtered = orders;

    if (status !== "all") {
      filtered =
        category === "order"
          ? orders.filter((o) => o.status === status)
          : orders.filter((o) => o.payment_status === status);
    }

    const finalFiltered = filtered.filter((o) =>
      o.order_number.toLowerCase().includes(searchValue.toLowerCase())
    );

    onFilter(finalFiltered);
  };

  const statuses = category === "order" ? orderStatuses : paymentStatuses;

  const getStatusCount = (status: string) => {
    if (status === "all") return orders.length;

    return category === "order"
      ? orders.filter((o) => o.status === status).length
      : orders.filter((o) => o.payment_status === status).length;
  };

  return (
    <div className="mb-4 w-full">
      {/* Category Tabs */}
      <Tabs
        activeKey={category}
        onChange={handleCategoryChange}
        items={[
          { key: "order", label: "Order Status" },
          { key: "payment", label: "Payment Status" },
        ]}
        type="card"
      />

      {/* Search + Status Buttons */}
      <div
        className="
          flex flex-col sm:flex-row justify-between items-start sm:items-center 
          gap-4 mt-4 flex-wrap
        "
      >
        {/* Search Input */}
        <div className="w-full sm:w-auto flex-1">
          <Input.Search
            placeholder="Search by Order Number"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            allowClear
            size="middle"
            className="w-full sm:w-72"
          />
        </div>

        {/* Status Buttons */}
        <div
          className="
            flex flex-wrap justify-start sm:justify-end gap-2 
            w-full sm:w-auto
          "
        >
          {statuses.map((status) => {
            const isActive = activeStatus === status;
            const count = getStatusCount(status);

            return (
              <button
                key={status}
                type="button"
                onClick={() => handleStatusChange(status)}
                aria-pressed={isActive}
                className={`
                  px-3 py-1.5 text-xs sm:text-sm rounded-full border font-medium 
                  transition-all duration-200 flex items-center gap-2 
                  ${statusColors[status]} 
                  ${
                    isActive
                      ? "ring-2 ring-offset-1 ring-blue-500 scale-105"
                      : "hover:scale-105 hover:shadow-sm"
                  }
                `}
              >
                <span>{capitalize(status)}</span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] sm:text-xs rounded-full ${
                    isActive
                      ? "bg-white text-gray-800"
                      : "bg-black bg-opacity-20 text-white"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OrdersFilterTabs;
