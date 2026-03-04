"use client";

import React from "react";

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  change: React.ReactNode;
  changeType: "positive" | "negative" | "neutral";
  description?: string;
}

const meta = {
  positive: {
    bar: "from-emerald-400 to-teal-400",
    pill: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30",
    arrow: "↑",
  },
  negative: {
    bar: "from-rose-400 to-pink-400",
    pill: "bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30",
    arrow: "↓",
  },
  neutral: {
    bar: "from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500",
    pill: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600",
    arrow: "→",
  },
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  change,
  changeType,
  description,
}) => {
  const m = meta[changeType];
  return (
    <div
      className="relative flex flex-col gap-2 sm:gap-3 p-3 sm:p-4 rounded-2xl overflow-hidden
      bg-white dark:bg-gray-900
      border border-gray-200 dark:border-gray-700/80
      shadow-sm dark:shadow-none
      transition-colors"
    >
      {/* Top accent bar */}
      <div
        className={`absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r ${m.bar}`}
      />

      {/* Icon row — icon left, nothing right (pill moves below) */}
      <div className="mt-1">
        <div
          className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center
          text-base sm:text-lg shrink-0
          bg-gray-100 dark:bg-gray-800
          border border-gray-200 dark:border-gray-700
          text-gray-600 dark:text-gray-300"
        >
          {icon}
        </div>
      </div>

      {/* Value + title + description */}
      <div className="min-w-0">
        {/* Value: never truncates, shrinks font on mobile */}
        <div
          className="text-lg sm:text-[22px] font-black tabular-nums leading-none tracking-tight
          text-gray-900 dark:text-white break-all"
        >
          {value}
        </div>

        {/* Title: always wraps fully — no truncation */}
        <div
          className="text-[10px] sm:text-[11px] font-semibold mt-1 sm:mt-1.5 leading-snug
          text-gray-600 dark:text-gray-300"
        >
          {title}
        </div>

        {/* Description: wraps too */}
        {description && (
          <div
            className="text-[9px] sm:text-[10px] mt-0.5 sm:mt-1 leading-snug
            text-gray-400 dark:text-gray-500"
          >
            {description}
          </div>
        )}

        {/* Change pill — sits below title, wraps freely */}
        <div className="mt-1.5 sm:mt-2">
          <span
            className={`inline-flex items-start gap-0.5 sm:gap-1
            text-[9px] sm:text-[10px] font-black
            px-1.5 sm:px-2 py-0.5 rounded-full border
            leading-snug
            ${m.pill}`}
          >
            {/* Arrow never wraps */}
            <span className="shrink-0 mt-px">{m.arrow}</span>
            {/* Change text wraps onto multiple lines if needed */}
            <span className="wrap-break-word">{change}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default StatCard;
