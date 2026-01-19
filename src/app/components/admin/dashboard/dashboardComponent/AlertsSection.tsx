"use client";

import React from "react";
import { Card, Button } from "antd";
import { useRouter } from "next/navigation";
import { StockFilter } from "@/lib/types/enums";
import {
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";

interface AlertsSectionProps {
  alerts: {
    type: "stock" | "order" | "payment";
    message: string;
    count: number;
  }[];
}

const AlertsSection: React.FC<AlertsSectionProps> = ({ alerts }) => {
  const router = useRouter();

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "stock":
        return <ExclamationCircleOutlined className='text-chart-3!' />;
      case "order":
        return <ClockCircleOutlined className='text-chart-5!' />;
      case "payment":
        return <WarningOutlined className='text-chart-4!' />;
      default:
        return <ExclamationCircleOutlined />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case "stock":
        return "bg-amber-50 border-amber-200";
      case "order":
        return "bg-red-50 border-red-200";
      case "payment":
        return "bg-purple-50 border-purple-200";
      default:
        return "bg-gray-50";
    }
  };

  const handleActionClick = (alert: { type: string; message: string }) => {
    if (alert.type === "stock") {
      const filter = alert.message.toLowerCase().includes("low")
        ? StockFilter.LOW
        : StockFilter.OUT;

      router.push(`/dashboard/products/stocks-update?filter=${filter}`);
    } else if (alert.type === "order") {
      // Check if the order message contains "pending"
      const isPending = alert.message.toLowerCase().includes("pending");
      const url = isPending
        ? "/dashboard/orders?status=pending"
        : "/dashboard/orders";

      router.push(url);
    } else if (alert.type === "payment") {
      const isPending = alert.message.toLowerCase().includes("pending");
      const url = isPending
        ? "/dashboard/orders?category=payment&payment_status=pending"
        : "/dashboard/orders";

      router.push(url);
    }
  };

  return (
    <Card className='border-l-4 border-l-amber-500'>
      <div className='space-y-3'>
        {alerts.map((alert, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-between p-3 rounded-lg ${getAlertColor(
              alert.type
            )}`}
          >
            <div className='flex items-center gap-3'>
              <div className='text-xl'>{getAlertIcon(alert.type)}</div>
              <div>
                <div className='font-semibold text-black'>{alert.message}</div>
                <div className='text-sm text-black'>
                  {alert.count} item{alert.count > 1 ? "s" : ""} affected
                </div>
              </div>
            </div>
            <Button
              type='primary'
              size='small'
              onClick={() => handleActionClick(alert)}
            >
              Take Action
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default AlertsSection;
