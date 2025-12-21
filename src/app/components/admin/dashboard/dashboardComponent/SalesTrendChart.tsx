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
} from "recharts";
import { Card, Button } from "antd";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";

interface SalesTrendChartProps {
  data: { date: string; sales: number }[];
}

const SalesTrendChart: React.FC<SalesTrendChartProps> = ({ data }) => {
  const [selectedDays, setSelectedDays] = useState(7);

  // Get currency and icon
  const {
    currency,
    icon,
    loading: currencyLoading,
    error: currencyError,
  } = useUserCurrencyIcon();

  const filteredData = useMemo(
    () => data.slice(-selectedDays),
    [data, selectedDays]
  );

  const previousPeriodData = useMemo(() => {
    const prevData = data.slice(-(selectedDays * 2), -selectedDays);
    return prevData.length === selectedDays
      ? prevData.map((d) => ({ date: d.date, sales: d.sales }))
      : [];
  }, [data, selectedDays]);

  // Combine current and previous period for Recharts
  const chartData = filteredData.map((d, i) => ({
    date: d.date,
    Sales: d.sales,
    "Previous Period": previousPeriodData[i]?.sales ?? null,
  }));

  const formatTooltip = (value: number | null) => {
    if (value === null) return "";
    if (!currency) return value.toFixed(2);
    if (typeof icon === "string") return `${icon} ${value.toFixed(2)}`;
    return `${currency} ${value.toFixed(2)}`;
  };

  if (currencyLoading) return <div>Loading chart...</div>;
  if (currencyError) return <div>Error loading currency</div>;

  return (
    <Card className="shadow-sm">
      <div className="flex flex-wrap gap-2 mb-3 justify-center sm:justify-end">
        {[7, 14, 30].map((d) => (
          <Button
            key={d}
            type={selectedDays === d ? "primary" : "default"}
            size="small"
            onClick={() => setSelectedDays(d)}
          >
            Last {d} Days
          </Button>
        ))}
      </div>

      <div className="w-full h-[260px] sm:h-[300px] md:h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
          >
            <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              angle={-45}
              textAnchor="end"
              interval={0}
              tick={{ fontSize: 11 }}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value) => formatTooltip(value as number)}
              contentStyle={{ fontSize: "12px" }}
            />
            <Line
              type="monotone"
              dataKey="Sales"
              stroke="#4f46e5"
              strokeWidth={3}
            />
            {previousPeriodData.length > 0 && (
              <Line
                type="monotone"
                dataKey="Previous Period"
                stroke="#a3bffa"
                strokeWidth={3}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default SalesTrendChart;
