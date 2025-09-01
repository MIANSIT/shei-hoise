"use client";

import React from "react";
import { Tag } from "antd";

interface Props {
  status: "paid" | "pending" | "failed";
}

const paymentColors: Record<Props["status"], string> = {
  paid: "green",
  pending: "orange",
  failed: "red",
};

const PaymentStatusTag: React.FC<Props> = ({ status }) => (
  <Tag color={paymentColors[status]}>{status.toUpperCase()}</Tag>
);

export default PaymentStatusTag;
