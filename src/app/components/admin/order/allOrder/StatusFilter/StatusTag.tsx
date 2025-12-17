"use client";

import React from "react";
import { Tag } from "antd";
import { OrderStatus, PaymentStatus, DeliveryOption, PaymentMethod } from "@/lib/types/enums";

export type StatusType = OrderStatus | PaymentStatus | DeliveryOption | PaymentMethod;

interface Props {
  status: StatusType;
  size?: "small" | "default" | "large";
}

// Map status to AntD color
// Map status to AntD color
const statusColors: Record<StatusType, string> = {
  // Order statuses
  pending: "orange",
  confirmed: "blue",
  shipped: "purple",
  delivered: "green",
  cancelled: "red",

  // Payment statuses
  paid: "green",
  failed: "red",
  refunded: "orange",

  // Delivery options
  pathao: "blue",
  courier: "cyan",
  other: "geekblue",
  "inside dhaka": "geekblue",
  "outside dhaka": "volcano",

  // Payment methods
  cod: "magenta",
  cash: "magenta",
  online: "purple",
  card: "purple",
  bank_transfer: "gold",
  mobile_banking: "lime",
};


// Friendly labels for statuses - SHORTENED VERSIONS
const statusLabels: Record<StatusType, string> = {
  // Order statuses
  pending: "Pending",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",

  // Payment statuses
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",

  // Delivery options
  pathao: "Pathao",
  courier: "Courier",
  other: "Other",
  "inside dhaka": "Inside Dhaka",
  "outside dhaka": "Outside Dhaka",

  // Payment methods
  cod: "COD",
  cash: "COD",
  online: "Online",
  card: "Card",
  bank_transfer: "Bank Transfer",
  mobile_banking: "Mobile Banking",
};


// Tailwind size classes
const sizeClasses = {
  small: "text-xs px-1.5 py-0.5  text-center",
  default: "text-sm px-2 py-1 min-w-[60px] text-center",
  large: "text-base px-3 py-1.5 min-w-[70px] text-center",
};

const StatusTag: React.FC<Props> = ({ status, size = "default" }) => (
  <Tag
    color={statusColors[status]}
    className={`capitalize ${sizeClasses[size]} break-keep whitespace-nowrap`}
  >
    {statusLabels[status]}
  </Tag>
);

export default StatusTag;