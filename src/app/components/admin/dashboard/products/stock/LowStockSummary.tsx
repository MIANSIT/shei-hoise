"use client";

import React, { useState } from "react";
import { ProductRow } from "@/lib/hook/products/stock/mapProductsForTable";

interface LowStockSummaryProps {
  products: ProductRow[];
}

const LowStockSummary: React.FC<LowStockSummaryProps> = ({ products }) => {
  const [outExpanded, setOutExpanded] = useState(false);
  const [lowExpanded, setLowExpanded] = useState(false);

  const outOfStock: string[] = [];
  const lowStock: string[] = [];

  products.forEach((product) => {
    if (product.stock === 0) outOfStock.push(product.title);
    else if (product.isLowStock) lowStock.push(product.title);

    product.variants?.forEach((variant) => {
      const name = `${product.title} — ${variant.title}`;
      if (variant.stock === 0) outOfStock.push(name);
      else if (variant.isLowStock) lowStock.push(name);
    });
  });

  if (outOfStock.length === 0 && lowStock.length === 0) return null;

  const PREVIEW_COUNT = 3;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
      {outOfStock.length > 0 && (
        <StockAlert
          tone="out"
          label="Out of Stock"
          count={outOfStock.length}
          items={outOfStock}
          expanded={outExpanded}
          onToggle={() => setOutExpanded((p) => !p)}
          previewCount={PREVIEW_COUNT}
        />
      )}
      {lowStock.length > 0 && (
        <StockAlert
          tone="low"
          label="Low Stock"
          count={lowStock.length}
          items={lowStock}
          expanded={lowExpanded}
          onToggle={() => setLowExpanded((p) => !p)}
          previewCount={PREVIEW_COUNT}
        />
      )}
    </div>
  );
};

/* ─── StockAlert ─────────────────────────────────────────────── */

interface StockAlertProps {
  tone: "out" | "low";
  label: string;
  count: number;
  items: string[];
  expanded: boolean;
  onToggle: () => void;
  previewCount: number;
}

const toneConfig = {
  out: {
    border: "border-l-red-500 dark:border-l-red-500",
    iconColor: "text-red-500 dark:text-red-400",
    badge: "bg-red-500 text-white",
    label: "text-gray-500 dark:text-gray-400",
    chip: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50",
    toggle:
      "text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-200",
    divider: "border-gray-100 dark:border-gray-800",
  },
  low: {
    border: "border-l-amber-500 dark:border-l-amber-500",
    iconColor: "text-amber-500 dark:text-amber-400",
    badge: "bg-amber-500 text-white",
    label: "text-gray-500 dark:text-gray-400",
    chip: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50",
    toggle:
      "text-amber-500 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-200",
    divider: "border-gray-100 dark:border-gray-800",
  },
};

const OutIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
    <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4zm0 8a1 1 0 110-2 1 1 0 010 2z" />
  </svg>
);

const LowIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
    <path
      fillRule="evenodd"
      d="M8 1.5a.75.75 0 01.692.462l5.25 11.5a.75.75 0 01-.692 1.038H2.75a.75.75 0 01-.692-1.038l5.25-11.5A.75.75 0 018 1.5zM8 5a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0v-3A.75.75 0 018 5zm0 6.5a.875.875 0 110-1.75.875.875 0 010 1.75z"
      clipRule="evenodd"
    />
  </svg>
);

const ChevronUp = () => (
  <svg viewBox="0 0 12 12" fill="currentColor" className="w-2.5 h-2.5 shrink-0">
    <path d="M6 4.5L10 8.5H2L6 4.5Z" />
  </svg>
);

const ChevronDown = () => (
  <svg viewBox="0 0 12 12" fill="currentColor" className="w-2.5 h-2.5 shrink-0">
    <path d="M6 7.5L2 3.5H10L6 7.5Z" />
  </svg>
);

const StockAlert: React.FC<StockAlertProps> = ({
  tone,
  label,
  count,
  items,
  expanded,
  onToggle,
  previewCount,
}) => {
  const c = toneConfig[tone];
  const visible = expanded ? items : items.slice(0, previewCount);
  const remaining = items.length - previewCount;

  return (
    <div
      className={[
        "min-w-0 rounded-xl",
        "bg-white dark:bg-gray-900",
        "border border-gray-200 dark:border-gray-800",
        "border-l-[3px]",
        c.border,
        "px-3.5 py-3",
      ].join(" ")}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2.5">
        <span className={c.iconColor}>
          {tone === "out" ? <OutIcon /> : <LowIcon />}
        </span>
        <span
          className={`text-[11px] font-semibold tracking-widest uppercase ${c.label}`}
        >
          {label}
        </span>
        <span
          className={`ml-auto text-[11px] font-bold px-1.5 py-0.5 rounded-md leading-none ${c.badge}`}
        >
          {count}
        </span>
      </div>

      {/* Divider */}
      <div className={`border-t ${c.divider} mb-2.5`} />

      {/* Chips — flex-wrap so they reflow naturally on any width */}
      <div className="flex flex-wrap gap-1.5">
        {visible.map((name) => (
          <span
            key={name}
            title={name}
            className={[
              "inline-flex items-center",
              "text-[11px] font-medium",
              "px-2 py-0.5 rounded-lg leading-none",
              "max-w-full truncate",
              c.chip,
            ].join(" ")}
          >
            {name}
          </span>
        ))}

        {items.length > previewCount && (
          <button
            type="button"
            onClick={onToggle}
            className={[
              "inline-flex items-center gap-0.5",
              "text-[11px] font-semibold",
              "px-2 py-0.5 rounded-lg leading-none",
              "transition-colors bg-transparent border-none cursor-pointer",
              c.toggle,
            ].join(" ")}
          >
            {expanded ? (
              <>
                <ChevronUp />
                Show less
              </>
            ) : (
              <>
                <ChevronDown />+{remaining} more
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default LowStockSummary;
