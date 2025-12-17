"use client";

import React from "react";
import { Card, Typography } from "antd";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";

const { Title, Text } = Typography;

interface OrderAmountCardProps {
  title: string;
  amount: number;
  status?: "paid" | "pending" | "refunded";
}

const statusColorMap: Record<string, string> = {
  paid: "#4BB543",
  pending: "#FAAD14",
  refunded: "#FF4D4F",
};

const OrderAmountCard: React.FC<OrderAmountCardProps> = ({
  title,
  amount,
  status,
}) => {
  const color = status ? statusColorMap[status] : "#1677ff";

  const { icon: currencyIcon, loading: currencyLoading } =
    useUserCurrencyIcon();

  // Use loading fallback
  const displayCurrency = currencyLoading ? null : currencyIcon;
  const displayCurrencySafe = displayCurrency || "৳"; // fallback

  return (
    <Card className="rounded-xl p-4">
      <div className="flex items-center justify-between">
        {/* Text and Amount */}
        <div>
          <Text className="text-sm font-medium text-gray-600">{title}</Text>
          <Title level={3} style={{ margin: 0, color, fontWeight: 800 }}>
            {displayCurrencySafe} {amount.toLocaleString()}
          </Title>
        </div>

        {/* Icon Circle */}
        <div
          className="w-12 h-12 flex items-center justify-center rounded-full"
          style={{ background: "#f0f0f0", color }}
        >
          <span style={{ fontSize: 30 }}>{displayCurrencySafe}</span>
        </div>
      </div>
    </Card>
  );
};

export default OrderAmountCard;
