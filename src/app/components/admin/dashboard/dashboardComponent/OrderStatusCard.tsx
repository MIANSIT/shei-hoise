"use client";

import React from "react";
import { Card } from "antd";

interface OrderStatusCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  textColor: string;
}

const OrderStatusCard: React.FC<OrderStatusCardProps> = ({
  title,
  value,
  icon,
  color,
  textColor,
}) => {
  return (
    <Card className={`${color} border-0 shadow-sm rounded-xl p-4`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Icon – FIRST on mobile */}
        <div
          className="w-10 h-10 sm:w-12 sm:h-12 mx-auto sm:mx-0 flex items-center justify-center rounded-full"
          style={{ background: "#f0f0f0" }}
        >
          <span className={`text-lg sm:text-2xl ${textColor}`}>{icon}</span>
        </div>

        {/* Text – LAST on mobile */}
        <div className="text-center sm:text-right">
          <div className={`text-lg sm:text-xl font-semibold  ${textColor}`}>
            {value}
          </div>
          <div className="text-xs sm:text-sm font-bold text-foreground">
            {title}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default OrderStatusCard;
