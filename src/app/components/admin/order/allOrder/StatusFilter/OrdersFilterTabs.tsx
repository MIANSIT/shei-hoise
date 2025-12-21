"use client";

import React, { useState, useRef } from "react";
import { Tabs, Input, Button, Space } from "antd";
import { StoreOrder } from "@/lib/types/order";
import { SearchOutlined } from "@ant-design/icons";
import { useUrlSync } from "@/lib/hook/filterWithUrl/useUrlSync";
import MobileFilter from "@/app/components/admin/common/MobileFilter"; // adjust path

interface Props {
  orders: StoreOrder[];
  totalOrders: number;
  totalByOrderStatus?: Record<string, number>;
  totalByPaymentStatus?: Record<string, number>;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onStatusChange?: (status: string) => void;
  onPaymentStatusChange?: (status: string) => void;
  initialCategory?: "order" | "payment";
  initialStatus?: string;
}

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
  searchValue,
  onSearchChange,
  onStatusChange,
  onPaymentStatusChange,
  totalOrders,
  totalByOrderStatus,
  totalByPaymentStatus,
  initialCategory = "order",
  initialStatus = "all",
}) => {
  const [category, setCategory] = useUrlSync<"order" | "payment">(
    "category",
    initialCategory
  );

  const [activeStatus, setActiveStatus] = useUrlSync<string>(
    category === "order" ? "status" : "payment_status",
    initialStatus
  );

  const [isTyping, setIsTyping] = useState(false);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  const orderStatuses = [
    "all",
    "pending",
    "confirmed",
    "shipped",
    "delivered",
    "cancelled",
  ];
  const paymentStatuses = ["all", "pending", "paid", "failed", "refunded"];
  const statuses = category === "order" ? orderStatuses : paymentStatuses;

  // Debounce input
  const handleInputChange = (value: string) => {
    onSearchChange(value);
    setIsTyping(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => setIsTyping(false), 800);
  };

  const handleStatusChange = (status: string) => {
    setActiveStatus(status);

    if (category === "order" && onStatusChange) onStatusChange(status);
    if (category === "payment" && onPaymentStatusChange)
      onPaymentStatusChange(status);

    const url = new URL(window.location.href);
    url.searchParams.set("page", "1");

    if (category === "order") {
      if (status === "all") url.searchParams.delete("status");
      else url.searchParams.set("status", status);
      url.searchParams.delete("payment_status");
    } else {
      if (status === "all") url.searchParams.delete("payment_status");
      else url.searchParams.set("payment_status", status);
      url.searchParams.delete("status");
    }

    window.history.replaceState(null, "", url.toString());
  };

  const handleCategoryChange = (key: string) => {
    setCategory(key as "order" | "payment");
    setActiveStatus("all");

    if (key === "order" && onStatusChange) onStatusChange("all");
    if (key === "payment" && onPaymentStatusChange)
      onPaymentStatusChange("all");

    const url = new URL(window.location.href);
    url.searchParams.set("page", "1");
    url.searchParams.set("category", key);
    url.searchParams.delete("status");
    url.searchParams.delete("payment_status");
    window.history.replaceState(null, "", url.toString());
  };

  const getStatusCount = (status: string) => {
    if (status === "all") return totalOrders;
    if (category === "order" && totalByOrderStatus)
      return totalByOrderStatus[status] || 0;
    if (category === "payment" && totalByPaymentStatus)
      return totalByPaymentStatus[status] || 0;
    return orders.filter((o) =>
      category === "order" ? o.status === status : o.payment_status === status
    ).length;
  };

  return (
    <div className="mb-4 w-full">
      <Tabs
        activeKey={category}
        onChange={handleCategoryChange}
        items={[
          { key: "order", label: "Order Status" },
          { key: "payment", label: "Payment Status" },
        ]}
        type="card"
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-4 flex-wrap">
        <div className="w-full md:w-1/2">
          <Space.Compact className="w-full">
            <Input
              placeholder="Search by Order #"
              value={searchValue}
              onChange={(e) => handleInputChange(e.target.value)}
              allowClear
              onPressEnter={(e) => onSearchChange(e.currentTarget.value)}
              suffix={
                isTyping ? <span className="text-xs">Typing...</span> : null
              }
            />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={() => onSearchChange(searchValue)}
            />
          </Space.Compact>
        </div>

        {/* Filter Buttons / MobileFilter */}
        <div className="w-full md:w-auto">
          {/* Desktop: button-style filters */}
          <div className="hidden md:flex flex-wrap gap-2">
            {statuses.map((status) => {
              const isActive = activeStatus === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleStatusChange(status)}
                  className={`px-3 py-1.5 text-xs sm:text-sm rounded-full border font-medium flex items-center gap-2 transition-all duration-200 ${
                    statusColors[status]
                  } ${
                    isActive
                      ? "ring-2 ring-offset-1 ring-blue-500 scale-105"
                      : "hover:scale-105 hover:shadow-sm"
                  }`}
                >
                  <span>{capitalize(status)}</span>
                  <span
                    className={`px-1.5 py-0.5 text-[10px] sm:text-xs rounded-full ${
                      isActive
                        ? "bg-white text-gray-800"
                        : "bg-black bg-opacity-20 text-white"
                    }`}
                  >
                    {getStatusCount(status)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Mobile: MobileFilter */}
          <MobileFilter
            value={activeStatus}
            defaultValue="all"
            options={statuses}
            onChange={handleStatusChange}
            getLabel={(status) =>
              `${capitalize(status)} (${getStatusCount(status)})`
            }
          />
        </div>
      </div>
    </div>
  );
};

export default OrdersFilterTabs;
