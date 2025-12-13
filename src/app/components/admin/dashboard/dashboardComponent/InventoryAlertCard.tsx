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
  // actionText: string;
  onAction?: () => void;
}

const InventoryAlertCard: React.FC<InventoryAlertCardProps> = ({
  title,
  value,
  icon,
  color,
  // actionText,
  // onAction,
}) => {
  // const isCritical = title === "Low Stock" || title === "Out of Stock";

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
      <div className="flex items-center justify-between flex-wrap min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-2xl shrink-0">{icon || defaultIcon}</div>
          <div className="min-w-0">
            <div className="text-lg font-semibold truncate">{value}</div>
            <div className="text-sm text-gray-600 truncate">{title}</div>
          </div>
        </div>
        {/* <Button
          type={isCritical ? "primary" : "default"}
          size="small"
          danger={isCritical && title === "Out of Stock"}
          className="mt-2 md:mt-0 shrink-0"
          onClick={onAction}
        >
          {actionText}
        </Button> */}
      </div>
    </Card>
  );
};

export default InventoryAlertCard;
