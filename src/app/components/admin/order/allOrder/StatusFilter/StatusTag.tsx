"use client";

import React from "react";
import { Tag } from "antd";

// Combined types for order, delivery, payment
export type StatusType =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "paid"
  | "failed"
  | "pathao"
  | "courier"
  | "other"
  | "cod"
  | "online";

interface Props {
  status: StatusType;
}

// Colors for each type
const statusColors: Record<StatusType, string> = {
  pending: "orange",
  processing: "gold",
  shipped: "purple",
  delivered: "green",
  cancelled: "red",
  paid: "green",
  failed: "red",
  pathao: "blue",
  courier: "cyan",
  other: "geekblue",
  cod: "magenta",
  online: "purple",
};

const StatusTag: React.FC<Props> = ({ status }) => (
  <Tag color={statusColors[status]}>{status.toUpperCase()}</Tag>
);

export default StatusTag;
