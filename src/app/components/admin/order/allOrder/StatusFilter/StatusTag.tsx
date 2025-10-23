"use client";

import React from "react";
import { Tag } from "antd";
import { OrderStatus, PaymentStatus, DeliveryOption, PaymentMethod } from "@/lib/types/order";

export type StatusType = OrderStatus | PaymentStatus | DeliveryOption | PaymentMethod;

interface Props {
  status: StatusType;
}

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

const StatusTag: React.FC<Props> = ({ status }) => (
  <Tag color={statusColors[status]} className="capitalize">
    {status}
  </Tag>
);

export default StatusTag;