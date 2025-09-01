"use client";

import React from "react";
import { Tag } from "antd";

type StatusType =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "paid"
  | "failed";

interface Props {
  status: StatusType;
}

const statusColors: Record<StatusType, string> = {
  pending: "orange",
  processing: "gold",
  shipped: "purple",
  delivered: "green",
  cancelled: "red",
  paid: "green",
  failed: "red",
};

const StatusTag: React.FC<Props> = ({ status }) => (
  <Tag color={statusColors[status]}>{status.toUpperCase()}</Tag>
);

export default StatusTag;
