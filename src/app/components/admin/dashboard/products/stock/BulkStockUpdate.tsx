"use client";

import React, { useState } from "react";
import {
  MinusOutlined,
  PlusOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { InputNumber } from "antd";
// import SheiButton from "@/app/components/ui/SheiButton/SheiButton";

interface BulkStockUpdateProps {
  selectedCount: number;
  onUpdate: (value: number) => Promise<void>;
  loading?: boolean;
}

const BulkStockUpdate: React.FC<BulkStockUpdateProps> = ({
  selectedCount,
  onUpdate,
  loading = false,
}) => {
  const [bulkStock, setBulkStock] = useState<number>(0);

  const handleClick = async () => {
    if (selectedCount === 0) return;
    await onUpdate(bulkStock);
    setBulkStock(0);
  };

  if (selectedCount === 0) return null;

  const isZero = bulkStock === 0;

  return (
    <div
      className="
      flex flex-col sm:flex-row sm:items-center gap-3
      px-4 py-3 rounded-xl
      bg-blue-50/80 dark:bg-blue-950/30
      border border-blue-200/60 dark:border-blue-800/40
      backdrop-blur-sm
      transition-all duration-200
    "
    >
      {/* Left: label */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="
          flex items-center justify-center w-7 h-7 rounded-lg
          bg-blue-500 dark:bg-blue-600
          text-white text-xs font-bold
          shadow-sm
        "
        >
          {selectedCount}
        </div>
        <span className="text-sm font-medium text-blue-700 dark:text-blue-300 whitespace-nowrap">
          {selectedCount === 1 ? "item selected" : "items selected"}
        </span>
      </div>

      {/* Divider */}
      <div className="hidden sm:block w-px h-6 bg-blue-200 dark:bg-blue-700/60 shrink-0" />

      {/* Center: stepper */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-blue-600/70 dark:text-blue-400/70 font-medium whitespace-nowrap">
          {bulkStock < 0 ? "Remove" : bulkStock === 0 ? "Set / Add" : "Add"}
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setBulkStock((prev) => prev - 1)}
            disabled={loading}
            className="
              w-7 h-7 rounded-lg flex items-center justify-center
              bg-white dark:bg-gray-800
              border border-blue-200 dark:border-blue-700/60
              text-blue-600 dark:text-blue-400
              hover:bg-blue-100 dark:hover:bg-blue-900/40
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors duration-150
              text-xs font-bold
            "
          >
            <MinusOutlined />
          </button>

          <InputNumber
            value={bulkStock}
            onChange={(value) => setBulkStock(Number(value ?? 0))}
            controls={false}
            disabled={loading}
            className="
              w-16! rounded-lg! border-blue-200! dark:border-blue-700/60!
              dark:bg-gray-800/80!
              [&_input]:text-center! [&_input]:font-semibold!
              [&_input]:text-sm!
              [&_input]:dark:text-blue-100!
            "
            size="middle"
          />

          <button
            onClick={() => setBulkStock((prev) => prev + 1)}
            disabled={loading}
            className="
              w-7 h-7 rounded-lg flex items-center justify-center
              bg-white dark:bg-gray-800
              border border-blue-200 dark:border-blue-700/60
              text-blue-600 dark:text-blue-400
              hover:bg-blue-100 dark:hover:bg-blue-900/40
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors duration-150
              text-xs font-bold
            "
          >
            <PlusOutlined />
          </button>
        </div>
      </div>

      {/* Right: action button */}
      <div className="sm:ml-auto">
        <button
          onClick={handleClick}
          disabled={loading}
          className={`
            flex items-center justify-center gap-2
            w-full sm:w-auto
            px-4 py-2 rounded-lg
            text-sm font-semibold
            transition-all duration-150
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              isZero
                ? "bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-500 text-white shadow-sm shadow-orange-200 dark:shadow-orange-900/30"
                : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white shadow-sm shadow-blue-200 dark:shadow-blue-900/30"
            }
          `}
        >
          {loading ? (
            <svg
              className="animate-spin w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <ThunderboltOutlined className="text-xs" />
          )}
          <span>
            {loading
              ? "Updating…"
              : isZero
                ? `Set ${selectedCount} to 0`
                : `Apply to ${selectedCount}`}
          </span>
        </button>
      </div>
    </div>
  );
};

export default BulkStockUpdate;