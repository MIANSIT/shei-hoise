"use client";

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import dayjs from "dayjs";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { useLocalNum } from "@/lib/hook/useLocalNum";

interface ProfitTrendChartProps {
  data: { date: string; net_profit: number }[];
}

const CustomTooltip = ({
  active,
  payload,
  label,
  sym,
  n,
}: {
  active?: boolean;
  payload?: readonly { value?: number }[];
  label?: string | number;
  sym: string;
  n: (v: number | string) => string;
}) => {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value ?? 0;
  return (
    <div className="rounded-xl px-3 py-2 shadow-xl bg-card border border-border">
      <div className="text-[10px] font-bold uppercase tracking-wider mb-1 text-muted-foreground">
        {label}
      </div>
      <div
        className={`text-base font-black tabular-nums ${
          value < 0 ? "text-rose-600 dark:text-rose-400" : "text-indigo-600 dark:text-indigo-400"
        }`}
      >
        {sym} {n(value.toFixed(2))}
      </div>
    </div>
  );
};

const ProfitTrendChart: React.FC<ProfitTrendChartProps> = ({ data }) => {
  const { icon, loading } = useUserCurrencyIcon();
  const sym = loading ? "৳" : typeof icon === "string" ? icon : "৳";
  const n = useLocalNum();

  const chartData = data.map((d) => ({
    date: dayjs(d.date).format("MMM D"),
    "Net Profit": d.net_profit,
  }));

  return (
    <div className="h-52 sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="text-muted-foreground/60"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fill: "currentColor" }}
            className="text-muted-foreground"
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 9, fill: "currentColor" }}
            className="text-muted-foreground"
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <ReferenceLine y={0} stroke="currentColor" className="text-muted-foreground/60" />
          <Tooltip
            content={(props) => {
              const p = props as {
                active?: boolean;
                payload?: readonly { value?: number }[];
                label?: string | number;
              };
              return <CustomTooltip active={p.active} payload={p.payload} label={p.label} sym={sym} n={n} />;
            }}
          />
          <Area
            type="monotone"
            dataKey="Net Profit"
            stroke="#6366f1"
            strokeWidth={2.5}
            fill="url(#profitGrad)"
            dot={false}
            activeDot={{ r: 4, fill: "#6366f1", stroke: "#fff", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProfitTrendChart;
