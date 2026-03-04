"use client";

import type { ExpenseCategory } from "@/lib/types/expense/type";
import DynamicLucideIcon from "./DynamicLucideIcon";
import { getCategoryColor, hexToRgba } from "@/lib/types/expense/expense-utils";

export interface CategoryOption {
  value: string;
  label: string;
  category: ExpenseCategory;
}

export function renderCategoryOption(option: { data: CategoryOption }) {
  const c = option.data.category;
  const color = getCategoryColor(c);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {/* Icon swatch */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          flexShrink: 0,
          background: hexToRgba(color, 0.15),
          border: `1.5px solid ${hexToRgba(color, 0.35)}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <DynamicLucideIcon name={c.icon || "Tag"} size={13} color={color} />
      </div>

      {/* Name + default badge */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            className="text-gray-900 dark:text-gray-100"
            style={{
              fontSize: 13,
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {c.name}
          </span>
          {c.is_default && (
            <span
              className="bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.05em",
                padding: "1px 5px",
                borderRadius: 4,
                textTransform: "uppercase" as const,
                flexShrink: 0,
              }}
            >
              Default
            </span>
          )}
        </div>
      </div>

      {/* Color dot */}
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
          boxShadow: `0 0 0 2px ${hexToRgba(color, 0.25)}`,
        }}
      />
    </div>
  );
}

export function buildCategoryOptions(
  categories: ExpenseCategory[],
): CategoryOption[] {
  return categories.map((c) => ({
    value: c.id,
    label: c.name,
    category: c,
  }));
}
