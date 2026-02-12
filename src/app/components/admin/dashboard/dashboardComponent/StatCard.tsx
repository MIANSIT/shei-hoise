"use client";

import React from "react";
import { Card } from "antd";

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  description?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  change,
  changeType,
  description,
}) => {
  const getChangeColor = () => {
    switch (changeType) {
      case "positive":
        return "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900";
      case "negative":
        return "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900";
      default:
        return "text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-800";
    }
  };

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      {/* Icon */}
      <div className="shrink-0 flex justify-center sm:justify-start items-center w-full sm:w-auto">
        <div className="text-5xl sm:text-4xl text-blue-500">{icon}</div>
      </div>

      {/* Value + Title + Badge + Description */}
      <div className="flex flex-col items-center sm:items-start gap-2 text-center sm:text-left">
        <div className="text-2xl sm:text-3xl font-bold text-foreground">
          {value}
        </div>
        <div className="text-sm sm:text-base text-muted-foreground">
          {title}
        </div>
        <div
          className={`text-xs sm:text-sm px-3 py-1 rounded-full inline-block ${getChangeColor()}`}
        >
          {change}
        </div>
        {description && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {description}
          </div>
        )}
      </div>
    </Card>
  );
};

export default StatCard;
