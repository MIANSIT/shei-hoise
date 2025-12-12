"use client";

import React, { useState, useMemo } from "react";
import Chart from "react-apexcharts";
import { Card, Button } from "antd";

interface SalesTrendChartProps {
  data: { date: string; sales: number }[];
}

const SalesTrendChart: React.FC<SalesTrendChartProps> = ({ data }) => {
  const [selectedDays, setSelectedDays] = useState(7);

  // Filter chart data based on selected days
  const filteredData = useMemo(() => {
    return data.slice(-selectedDays);
  }, [data, selectedDays]);

  // Auto comparison to previous period
  const previousPeriodData = useMemo(() => {
    const prevData = data.slice(-(selectedDays * 2), -selectedDays);
    return prevData.length === selectedDays ? prevData.map((d) => d.sales) : [];
  }, [data, selectedDays]);

  const chartSeries = [
    {
      name: "Sales",
      data: filteredData.map((d) => d.sales),
    },
    previousPeriodData.length
      ? {
          name: "Previous Period",
          data: previousPeriodData,
        }
      : undefined,
  ].filter(Boolean) as { name: string; data: number[] }[];

  const chartOptions: ApexCharts.ApexOptions = {
    chart: { type: "area", toolbar: { show: false }, zoom: { enabled: false } },
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 3 },
    xaxis: {
      categories: filteredData.map((d) => d.date),
      labels: {
        rotate: -45,
        hideOverlappingLabels: true,
        showDuplicates: false,
        style: { fontSize: "11px" },
      },
    },
    tooltip: { y: { formatter: (val: number) => `BDT ${val.toFixed(2)}` } },
    grid: { borderColor: "#f0f0f0" },
    colors: ["#4f46e5", "#a3bffa"],
    fill: { type: "gradient", gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
    responsive: [
      {
        breakpoint: 600,
        options: {
          chart: {
            height: 260,
          },
          xaxis: {
            labels: {
              rotate: -45,
              show: true,
              style: { fontSize: "10px" },
            },
          },
          yaxis: {
            labels: {
              style: { fontSize: "10px" },
            },
          },
        },
      },
    ],
  };

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
        <Chart
          options={chartOptions}
          series={chartSeries}
          type="area"
          height="100%"
        />
      </div>
    </Card>
  );
};

export default SalesTrendChart;
