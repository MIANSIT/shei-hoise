"use client";

import React from "react";
import { Card, Typography } from "antd";
import { DollarOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

interface OrderAmountCardProps {
  title: string;
  amount: number;
  status?: "paid" | "pending" | "refunded";
  currency?: string; // New prop
}

const statusColorMap: Record<string, string> = {
  paid: "#4BB543", // green
  pending: "#FAAD14", // yellow
  refunded: "#FF4D4F", // red
};

const OrderAmountCard: React.FC<OrderAmountCardProps> = ({
  title,
  amount,
  status,
  currency = "BDT",
}) => {
  const color = status ? statusColorMap[status] : "#1677ff";

  // Determine icon/symbol based on currency
  const currencySymbol = currency === "BDT" ? "৳" : currency;
  const icon =
    currency === "BDT" ? (
      "৳"
    ) : (
      <DollarOutlined style={{ fontSize: 22, color }} />
    );

  return (
    <Card className="rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <Text className="text-sm font-medium text-gray-600">{title}</Text>
          <Title level={3} style={{ margin: 0, color, fontWeight: 800 }}>
            {currencySymbol} {amount.toLocaleString()}
          </Title>
        </div>
        <div
          className="w-12 h-12 flex items-center justify-center rounded-full"
          style={{ background: "#f0f0f0" }}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
};

export default OrderAmountCard;
