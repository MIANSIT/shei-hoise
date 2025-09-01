"use client";

import React from "react";
import { Tag } from "antd";

interface Props {
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
}

const statusColors: Record<Props["status"], string> = {
  pending: "orange",
  processing: "gold",
  shipped: "purple",
  delivered: "green",
  cancelled: "red",
};

const OrderStatusTag: React.FC<Props> = ({ status }) => (
  <Tag color={statusColors[status]}>{status.toUpperCase()}</Tag>
);

export default OrderStatusTag;
