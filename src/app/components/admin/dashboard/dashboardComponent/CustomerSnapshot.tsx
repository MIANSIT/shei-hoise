"use client";

import React from "react";

interface CustomerSnapshotProps {
  stats: {
    title: string;
    value: string;
    icon: React.ReactNode;
    subValue?: string | React.ReactNode;
  }[];
}

const CustomerSnapshot: React.FC<CustomerSnapshotProps> = ({ stats }) => {
  return (
    <div className="space-y-4">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between p-3 bg-ring rounded-lg"
        >
          <div className="flex items-center gap-3">
            <div className="text-xl text-foreground">{stat.icon}</div>
            <div>
              <div className="text-sm text-foreground">{stat.title}</div>
              <div className="font-semibold">{stat.value}</div>
              {stat.subValue && (
                <div className="text-xs text-foreground">{stat.subValue}</div>
              )}
            </div>
          </div>
          <div className="text-sm text-foreground">Last 7 days</div>
        </div>
      ))}
    </div>
  );
};

export default CustomerSnapshot;
