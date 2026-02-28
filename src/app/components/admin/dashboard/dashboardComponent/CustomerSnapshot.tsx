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

const accents = [
  {
    bar: "bg-blue-500",
    icon: "bg-blue-50 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-300",
    sub: "text-blue-600 dark:text-blue-400",
  },
  {
    bar: "bg-emerald-500",
    icon: "bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-300",
    sub: "text-emerald-600 dark:text-emerald-400",
  },
  {
    bar: "bg-violet-500",
    icon: "bg-violet-50 dark:bg-violet-500/15 border-violet-200 dark:border-violet-500/30 text-violet-600 dark:text-violet-300",
    sub: "text-violet-600 dark:text-violet-400",
  },
];

const CustomerSnapshot: React.FC<CustomerSnapshotProps> = ({ stats }) => (
  <div className="space-y-3">
    {stats.map((s, i) => {
      const a = accents[i] ?? accents[0];
      return (
        <div
          key={i}
          className="flex items-center gap-3 p-4 rounded-xl
            bg-gray-50 dark:bg-gray-800/60
            border border-gray-200 dark:border-gray-700
            transition-colors"
        >
          {/* Accent bar */}
          <div className={`w-0.5 h-10 rounded-full shrink-0 ${a.bar}`} />

          {/* Icon */}
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 border ${a.icon}`}
          >
            {s.icon}
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {s.title}
            </div>
            <div className="text-base font-black mt-0.5 truncate text-gray-900 dark:text-white">
              {s.value}
            </div>
            {s.subValue && (
              <div className={`text-[11px] font-semibold mt-0.5 ${a.sub}`}>
                {s.subValue}
              </div>
            )}
          </div>
        </div>
      );
    })}
  </div>
);

export default CustomerSnapshot;
