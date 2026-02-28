"use client";

import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";

interface SalesTrendChartProps {
  data: { date: string; sales: number }[];
}

const CustomTooltip = ({
  active,
  payload,
  label,
  sym,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  sym: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-3 py-2 shadow-xl
      bg-white dark:bg-gray-900
      border border-gray-200 dark:border-gray-700"
    >
      <div className="text-[10px] font-bold uppercase tracking-wider mb-1 text-gray-400 dark:text-gray-500">
        {label}
      </div>
      <div className="text-base font-black tabular-nums text-indigo-600 dark:text-indigo-400">
        {sym}{" "}
        {payload[0].value.toLocaleString(undefined, {
          minimumFractionDigits: 2,
        })}
      </div>
    </div>
  );
};

const SalesTrendChart: React.FC<SalesTrendChartProps> = ({ data }) => {
  const [days, setDays] = useState(14);
  const { icon, loading } = useUserCurrencyIcon();
  const sym = loading ? "৳" : typeof icon === "string" ? icon : "৳";

  const sliced = useMemo(() => data.slice(-days), [data, days]);
  const prevSlice = useMemo(() => {
    const p = data.slice(-(days * 2), -days);
    return p.length === days ? p : [];
  }, [data, days]);

  const chartData = sliced.map((d, i) => ({
    date: d.date,
    Sales: d.sales,
    "Prev Period": prevSlice[i]?.sales ?? null,
  }));

  const total = sliced.reduce((s, d) => s + d.sales, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Period Total
          </div>
          <div className="text-xl sm:text-2xl font-black tabular-nums text-gray-900 dark:text-white">
            {sym}{" "}
            {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Day picker */}
        <div
          className="flex gap-1 rounded-xl p-1
          bg-gray-100 dark:bg-gray-800
          border border-gray-200 dark:border-gray-700"
        >
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-[11px] font-black tracking-wider transition-all duration-150
                ${
                  days === d
                    ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/30"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
            >
              {d}D
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-44 sm:h-52">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
          >
            <defs>
              <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="prevGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="text-gray-200 dark:text-gray-700/60"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9, fill: "currentColor" }}
              className="text-gray-400 dark:text-gray-500"
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 9, fill: "currentColor" }}
              className="text-gray-400 dark:text-gray-500"
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip content={<CustomTooltip sym={sym} />} />
            {prevSlice.length > 0 && (
              <Area
                type="monotone"
                dataKey="Prev Period"
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fill="url(#prevGrad)"
                dot={false}
              />
            )}
            <Area
              type="monotone"
              dataKey="Sales"
              stroke="#6366f1"
              strokeWidth={2.5}
              fill="url(#salesGrad)"
              dot={false}
              activeDot={{
                r: 4,
                fill: "#6366f1",
                stroke: "#fff",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded bg-indigo-500" />
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            Current period
          </span>
        </div>
        {prevSlice.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 rounded bg-gray-300 dark:bg-gray-600" />
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              Previous period
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesTrendChart;
