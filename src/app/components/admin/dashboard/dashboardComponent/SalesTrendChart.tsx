"use client";

import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Card, Button } from "antd";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";

interface SalesTrendChartProps {
  data: { date: string; sales: number }[];
}

const SalesTrendChart: React.FC<SalesTrendChartProps> = ({ data }) => {
  const [selectedDays, setSelectedDays] = useState(7);

  const {
    currency,
    icon,
    loading: currencyLoading,
    error: currencyError,
  } = useUserCurrencyIcon();

  // Filter current and previous period
  const filteredData = useMemo(
    () => data.slice(-selectedDays),
    [data, selectedDays],
  );

  const previousPeriodData = useMemo(() => {
    const prev = data.slice(-(selectedDays * 2), -selectedDays);
    return prev.length === selectedDays ? prev : [];
  }, [data, selectedDays]);

  const chartData = filteredData.map((d, i) => ({
    date: d.date,
    Sales: d.sales,
    "Previous Period": previousPeriodData[i]?.sales ?? null,
  }));

  const formatTooltip = (value: number | null) => {
    if (value == null) return "";
    if (typeof icon === "string") return `${icon} ${value.toFixed(2)}`;
    return `${currency ?? ""} ${value.toFixed(2)}`;
  };

  if (currencyLoading) return <div>Loading chart...</div>;
  if (currencyError) return <div>Error loading currency</div>;

  return (
    <Card className="shadow-sm bg-white dark:bg-gray-800">
      {/* Time filter buttons */}
      <div className="flex flex-wrap gap-2 mb-4 justify-center sm:justify-end">
        {[7, 14, 30].map((d) => (
          <Button
            key={d}
            type={selectedDays === d ? "primary" : "default"}
            size="small"
            className="min-w-22.5"
            onClick={() => setSelectedDays(d)}
          >
            Last {d} Days
          </Button>
        ))}
      </div>

      {/* Chart container */}
      <div className="w-full h-85 sm:h-90 md:h-105">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 20, left: 0, bottom: 50 }}
          >
            {/* Grid */}
            <CartesianGrid
              stroke="#f0f0f0"
              strokeDasharray="3 3"
              className="dark:stroke-gray-700"
            />

            {/* X-Axis */}
            <XAxis
              dataKey="date"
              interval="preserveStartEnd"
              angle={window.innerWidth < 640 ? -20 : -30}
              textAnchor="end"
              tick={{ fontSize: 11, fill: "currentColor" }}
            />

            {/* Y-Axis */}
            <YAxis tick={{ fontSize: 11, fill: "currentColor" }} />

            {/* Tooltip */}
            <Tooltip
              formatter={(value) => formatTooltip(value as number)}
              contentStyle={{
                fontSize: "12px",
                backgroundColor: "var(--ant-background-color)",
                color: "var(--ant-text-color)",
              }}
            />

            {/* Legend */}
            <Legend
              verticalAlign="top"
              height={36}
              wrapperStyle={{ color: "currentColor" }}
            />

            {/* Current period */}
            <Line
              type="monotone"
              dataKey="Sales"
              stroke="#4f46e5"
              strokeWidth={3}
              dot={false}
            />

            {/* Previous period, hidden on mobile */}
            {previousPeriodData.length > 0 && (
              <Line
                type="monotone"
                dataKey="Previous Period"
                stroke="#a3bffa"
                strokeWidth={2}
                dot={false}
                strokeDasharray="5 5"
                className="hidden sm:block"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default SalesTrendChart;
