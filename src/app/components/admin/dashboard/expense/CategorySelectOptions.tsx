"use client";

import type { ExpenseCategory } from "@/lib/types/expense/type";
import DynamicLucideIcon from "./DynamicLucideIcon";
import { getCategoryColor, hexToRgba } from "@/lib/types/expense/expense-utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CategoryOption {
  value: string;
  label: string; // plain text — used by Select as the selected tag/display label
  category: ExpenseCategory;
}

// ─── Option renderer (passed to Select's optionRender prop) ──────────────────

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
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#111827",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {c.name}
          </span>
          {c.is_default && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.05em",
                color: "#9ca3af",
                background: "#f3f4f6",
                padding: "1px 5px",
                borderRadius: 4,
                textTransform: "uppercase",
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

// ─── Helper: convert ExpenseCategory[] → options array for Select ─────────────

export function buildCategoryOptions(
  categories: ExpenseCategory[],
): CategoryOption[] {
  return categories.map((c) => ({
    value: c.id,
    label: c.name,
    category: c,
  }));
}
