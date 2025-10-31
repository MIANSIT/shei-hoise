"use client";

import React from "react";
import { Card } from "antd";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { ChartData } from "@/lib/hook/useDashboardData";

interface WeeklySalesChartProps {
  data: ChartData[];
  title?: string;
}

// Recharts passes payload as array of objects with value and payload
interface TooltipItem {
  value: number;
  dataKey: string;
  payload: ChartData;
  color?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipItem[];
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
}) => {
  if (active && payload && payload.length > 0) {
    return (
      <div className="p-2 bg-black bg-opacity-70 text-white rounded">
        <div className="text-sm">{label}</div>
        <div className="font-semibold">${payload[0].value}</div>
      </div>
    );
  }
  return null;
};

const WeeklySalesChart: React.FC<WeeklySalesChartProps> = ({
  data,
  title = "Weekly Sales Overview",
}) => {
  return (
    <Card
      title={title}
      className="rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-4"
    >
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 20, right: 10, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: "#555" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#555" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="sales"
              stroke="#4f46e5"
              strokeWidth={3}
              fill="url(#colorSales)"
              activeDot={{ r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default WeeklySalesChart;
