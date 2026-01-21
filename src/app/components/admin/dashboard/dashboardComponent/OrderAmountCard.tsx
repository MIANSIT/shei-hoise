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

  const { icon: currencyIcon, loading } = useUserCurrencyIcon();
  const displayCurrency = loading ? "৳" : currencyIcon || "৳";

  return (
    <Card className="rounded-xl p-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* ICON */}
        <div
          className="w-10 h-10 sm:w-12 sm:h-12 mx-auto sm:mx-0 flex items-center justify-center rounded-full"
          style={{ background: "#f0f0f0", color }}
        >
          <span className="text-xl sm:text-2xl">{displayCurrency}</span>
        </div>

        {/* VALUE + TITLE */}
        <div className="text-center sm:text-left">
          <Title level={3} style={{ margin: 0, color, fontWeight: 800 }}>
            {amount.toLocaleString()} {displayCurrency}
          </Title>

          <Text className="text-sm font-medium text-foreground">{title}</Text>
        </div>
      </div>
    </Card>
  );
};

export default OrderAmountCard;
