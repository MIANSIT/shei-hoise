"use client";

import React from 'react';
import { Card } from 'antd';

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
    <Card className={`${color} border-0 shadow-sm`}>
      <div className="flex items-center justify-between">
        <div>
          <div className={`text-lg font-semibold ${textColor}`}>{value}</div>
          <div className="text-sm text-gray-600">{title}</div>
        </div>
        <div className={`text-2xl ${textColor}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
};

export default OrderStatusCard;