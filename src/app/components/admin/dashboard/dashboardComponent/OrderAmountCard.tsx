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
  const { currency, icon } = useUserCurrencyIcon();

  // If icon is a React component, assign to IconComponent
  const IconComponent = icon && typeof icon !== "string" ? icon : null;

  return (
    <Card className="rounded-xl p-4">
      <div className="flex items-center justify-between">
        {/* Text and Amount */}
        <div>
          <Text className="text-sm font-medium text-gray-600">{title}</Text>
          <Title level={3} style={{ margin: 0, color, fontWeight: 800 }}>
            {IconComponent ? (
              <>
                <IconComponent
                  style={{ fontSize: 22, color, marginRight: 4 }}
                />
                {amount.toLocaleString()}
              </>
            ) : typeof icon === "string" ? (
              <>
                {icon} {amount.toLocaleString()}
              </>
            ) : (
              <>
                {currency} {amount.toLocaleString()}
              </>
            )}
          </Title>
        </div>

        {/* Icon Circle */}
        <div
          className="w-12 h-12 flex items-center justify-center rounded-full"
          style={{ background: "#f0f0f0" }}
        >
          {IconComponent ? (
            <IconComponent style={{ fontSize: 30, color }} />
          ) : typeof icon === "string" ? (
            <span style={{ fontSize: 30, color }}>{icon}</span>
          ) : null}
        </div>
      </div>
    </Card>
  );
};

export default OrderAmountCard;
