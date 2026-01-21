"use client";

import React from "react";
import { Card } from "antd";
import {
  CheckCircleOutlined,
  ExclamationOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";

interface InventoryAlertCardProps {
  title: string;
  value: string;
  icon?: React.ReactNode;
  color: string;
}

const InventoryAlertCard: React.FC<InventoryAlertCardProps> = ({
  title,
  value,
  icon,
  color,
}) => {
  const defaultIcon =
    title === "In Stock" ? (
      <CheckCircleOutlined className="text-green-500" />
    ) : title === "Low Stock" ? (
      <ExclamationOutlined className="text-amber-500" />
    ) : (
      <CloseCircleOutlined className="text-red-500" />
    );

  return (
    <Card className={`${color} border-0 shadow-sm`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-w-0">
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-2xl shrink-0">{icon || defaultIcon}</div>

          <div className="min-w-0">
            <div className="text-base sm:text-lg font-semibold truncate">
              {value}
            </div>
            <div className="text-xs sm:text-sm text-foreground truncate">
              {title}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default InventoryAlertCard;
