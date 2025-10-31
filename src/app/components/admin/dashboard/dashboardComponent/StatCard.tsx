"use client";

import React from "react";
import { Card } from "antd";
import { Stat } from "@/lib/hook/useDashboardData";

const StatCard: React.FC<Stat> = ({ title, value, icon }) => {
  return (
    <Card className="shadow-sm hover:shadow-lg transition-all duration-300 rounded-xl p-5 ">
      <div className="flex items-center gap-4">
        <div className="text-3xl text-blue-600">{icon}</div>
        <div className="flex flex-col">
          <span className="text-gray-500 text-sm">{title}</span>
          <span className="text-xl font-semibold mt-1">{value}</span>
        </div>
      </div>
    </Card>
  );
};

export default StatCard;
