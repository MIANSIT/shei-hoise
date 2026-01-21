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
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 bg-sidebar-ring rounded-lg"
        >
          {/* Left content */}
          <div className="flex items-start gap-3">
            <div className="text-xl text-foreground mt-1">{stat.icon}</div>

            <div>
              <div className="text-sm text-foreground">{stat.title}</div>
              <div className="font-semibold">{stat.value}</div>
              {stat.subValue && (
                <div className="text-xs text-foreground">{stat.subValue}</div>
              )}
            </div>
          </div>

          {/* Right meta */}
          <div className="text-xs md:text-sm text-foreground md:text-right">
            Last 7 days
          </div>
        </div>
      ))}
    </div>
  );
};

export default CustomerSnapshot;
