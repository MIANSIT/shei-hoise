"use client";

import React from "react";
import { Tag } from "antd";
import { OrderStatus, PaymentStatus, DeliveryOption, PaymentMethod } from "@/lib/types/order";

export type StatusType = OrderStatus | PaymentStatus | DeliveryOption | PaymentMethod;

interface Props {
  status: StatusType;
  size?: "small" | "default" | "large"; // Optional size prop for custom styling
}

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

  // Payment methods
  cod: "magenta",
  online: "purple",
};

// Friendly labels for statuses
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

  // Payment methods
  cod: "Cash on Delivery",
  online: "Online Payment",
};

// Tailwind size classes
const sizeClasses = {
  small: "text-xs px-1.5 py-0.5",
  default: "text-sm px-2 py-1",
  large: "text-base px-3 py-1.5",
};

const StatusTag: React.FC<Props> = ({ status, size = "default" }) => (
  <Tag
    color={statusColors[status]}
    className={`capitalize ${sizeClasses[size]}`}
  >
    {statusLabels[status]}
  </Tag>
);

export default StatusTag;
