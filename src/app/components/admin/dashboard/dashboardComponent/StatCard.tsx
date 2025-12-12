"use client";

import React from "react";
import { Card } from "antd";

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  change,
  changeType,
}) => {
  const getChangeColor = () => {
    switch (changeType) {
      case 'positive': return 'text-green-600 bg-green-50';
      case 'negative': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-2xl font-bold text-gray-800">{value}</div>
          <div className="text-sm text-gray-600 mt-1">{title}</div>
          <div className={`text-xs px-2 py-1 rounded-full inline-block mt-2 ${getChangeColor()}`}>
            {change} from yesterday
          </div>
        </div>
        <div className="text-3xl text-blue-500">
          {icon}
        </div>
      </div>
    </Card>
  );
};

export default StatCard;