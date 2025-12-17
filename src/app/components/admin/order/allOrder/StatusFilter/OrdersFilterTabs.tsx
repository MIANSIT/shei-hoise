"use client";

import React, { useState, useEffect, useRef } from "react";
import { Tabs, Input, Button, Space } from "antd";
import { StoreOrder } from "@/lib/types/order";
import { SearchOutlined } from "@ant-design/icons";
import { useUrlSync } from "@/lib/hook/filterWithUrl/useUrlSync";

interface Props {
  orders: StoreOrder[];
  totalOrders: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onStatusChange?: (status: string) => void;
  onPaymentStatusChange?: (status: string) => void;
  // ✅ ADD THESE PROPS to receive URL params
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

export const highlightText = (text: string, search: string) => {
  if (!search) return text;
  const regex = new RegExp(`(${search})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <span key={i} className="bg-yellow-200 rounded px-1">
        {part}
      </span>
    ) : (
      part
    )
  );
};

const OrdersFilterTabs: React.FC<Props> = ({
  orders,
  searchValue,
  onSearchChange,
  onStatusChange,
  onPaymentStatusChange,
  totalOrders,
  // ✅ ADD THESE
  initialCategory = "order",
  initialStatus = "all",
}) => {
  // URL-synced category
  const [category, setCategory] = useUrlSync<"order" | "payment">(
    "category",
    initialCategory
  );

  // ✅ ADD URL-synced status based on category
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

  useEffect(() => {
    return () => {
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
  }, []);

  // ✅ Update activeStatus when category changes to match the URL param
  useEffect(() => {
    if (category === "order") {
      const params = new URLSearchParams(window.location.search);
      const statusParam = params.get("status") || "all";
      if (statusParam !== activeStatus) {
        setActiveStatus(statusParam);
      }
    } else {
      const params = new URLSearchParams(window.location.search);
      const paymentStatusParam = params.get("payment_status") || "all";
      if (paymentStatusParam !== activeStatus) {
        setActiveStatus(paymentStatusParam);
      }
    }
  }, [category, activeStatus, setActiveStatus]);

  const handleInputChange = (value: string) => {
    onSearchChange(value);
    setIsTyping(true);

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => setIsTyping(false), 800);
  };

  const getStatusCount = (status: string) => {
    if (status === "all") return totalOrders;

    return category === "order"
      ? orders.filter((o) => o.status === status).length
      : orders.filter((o) => o.payment_status === status).length;
  };

  const handleStatusChange = (status: string) => {
    setActiveStatus(status);

    if (category === "order" && onStatusChange) onStatusChange(status);
    if (category === "payment" && onPaymentStatusChange)
      onPaymentStatusChange(status);
  };

  const handleCategoryChange = (key: string) => {
    setCategory(key as "order" | "payment");

    // Reset to "all" for the new category
    setActiveStatus("all");

    if (key === "order" && onStatusChange) onStatusChange("all");
    if (key === "payment" && onPaymentStatusChange)
      onPaymentStatusChange("all");
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

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-4 flex-wrap">
        <div className="w-full sm:w-auto flex-1">
          <Space.Compact>
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

        <div className="flex flex-wrap justify-start sm:justify-end gap-2 w-full sm:w-auto">
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
