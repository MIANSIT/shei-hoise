"use client";

import React, { useState, useRef } from "react";
import { Segmented, Input } from "antd";
import { StoreOrder } from "@/lib/types/order";
import { SearchOutlined } from "@ant-design/icons";
import { useUrlSync } from "@/lib/hook/filterWithUrl/useUrlSync";
import MobileFilter from "@/app/components/admin/common/MobileFilter"; // adjust path
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";

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
  returned: "bg-orange-100 text-orange-800 border-orange-200",
  paid: "bg-green-100 text-green-800 border-green-200",
  failed: "bg-red-100 text-red-800 border-red-200",
  refunded: "bg-orange-100 text-orange-800 border-orange-200",
  all: "bg-gray-100 text-gray-800 border-gray-200",
};

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
  const t = useTranslation();
  const n = useLocalNum();
  const [category, setCategory] = useUrlSync<"order" | "payment">(
    "category",
    initialCategory
  );

  const [activeStatus, setActiveStatus] = useUrlSync<string>(
    category === "order" ? "status" : "payment_status",
    initialStatus
  );

  const [localSearch, setLocalSearch] = useState(searchValue);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  const orderStatuses = [
    "all",
    "pending",
    "confirmed",
    "shipped",
    "delivered",
    "cancelled",
    "returned",
  ];
  const paymentStatuses = ["all", "pending", "paid", "failed", "refunded"];
  const statuses = category === "order" ? orderStatuses : paymentStatuses;

  const getStatusLabel = (status: string): string => {
    const map: Record<string, string> = {
      all: t.admin.statusAll,
      pending: t.admin.pending,
      confirmed: t.admin.confirmed,
      shipped: t.admin.shipped,
      delivered: t.admin.delivered,
      cancelled: t.admin.cancelled,
      returned: t.admin.returned,
      paid: t.admin.statusPaid,
      failed: t.admin.statusFailed,
      refunded: t.admin.statusRefunded,
    };
    return map[status] ?? status;
  };

  const handleInputChange = (value: string) => {
    setLocalSearch(value); // update input display immediately
    setIsTyping(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      onSearchChange(value); // fire search only after 600ms pause
      setIsTyping(false);
    }, 600);
  };

  const handleSearchSubmit = () => {
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    setIsTyping(false);
    onSearchChange(localSearch);
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
    <div className="w-full space-y-3">
      <Input
        size="large"
        placeholder={t.admin.searchByOrderNum}
        value={localSearch}
        onChange={(e) => handleInputChange(e.target.value)}
        allowClear
        onClear={() => {
          setLocalSearch("");
          onSearchChange("");
        }}
        onPressEnter={handleSearchSubmit}
        prefix={<SearchOutlined className="text-muted-foreground" />}
        suffix={isTyping ? <span className="text-xs text-muted-foreground">{t.admin.typingLabel}</span> : null}
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Segmented
          value={category}
          onChange={(value) => handleCategoryChange(String(value))}
          options={[
            { value: "order", label: t.admin.orderStatusTab },
            { value: "payment", label: t.admin.paymentStatusTab },
          ]}
        />

        {/* Status buttons: one row that scrolls sideways when space is short. */}
        <div className="hidden min-w-0 flex-1 gap-2 overflow-x-auto py-1 md:flex [scrollbar-width:thin]">
          {statuses.map((status) => {
            const isActive = activeStatus === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => handleStatusChange(status)}
                className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                  statusColors[status]
                } ${isActive ? "ring-2 ring-blue-500 ring-offset-1" : "hover:shadow-sm"}`}
              >
                <span>{getStatusLabel(status)}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                    isActive ? "bg-white text-gray-800" : "bg-black/10 text-current"
                  }`}
                >
                  {n(getStatusCount(status))}
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
          getLabel={(status) => `${getStatusLabel(status)} (${n(getStatusCount(status))})`}
        />
      </div>
    </div>
  );
};

export default OrdersFilterTabs;
