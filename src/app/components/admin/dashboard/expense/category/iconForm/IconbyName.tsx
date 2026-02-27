"use client";

import { createElement } from "react";
import * as LucideIcons from "lucide-react";

export const ICON_NAMES: string[] = Object.keys(LucideIcons).filter((key) => {
  // Exclude Lucide-prefixed aliases (LucideTag, LucideHome, etc.) — use plain names only
  if (key.startsWith("Lucide")) return false;
  if (!/^[A-Z]/.test(key) || key === "default") return false;
  const val = (LucideIcons as Record<string, unknown>)[key];
  if (!val || typeof val !== "object") return false;
  const obj = val as Record<string, unknown>;
  return (
    obj["$$typeof"] !== undefined ||
    typeof obj["render"] === "function" ||
    typeof obj["type"] === "function"
  );
});

export const SUGGESTED_ICONS: string[] = [
  "ShoppingCart",
  "Briefcase",
  "DollarSign",
  "CreditCard",
  "TrendingUp",
  "Package",
  "Truck",
  "Wrench",
  "Coffee",
  "Zap",
  "Star",
  "Heart",
  "Tag",
  "Layers",
  "Globe",
  "Home",
  "Users",
  "Settings",
];

export function IconByName({
  name,
  size = 16,
  strokeWidth = 1.75,
  className,
}: {
  name: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const comp = (LucideIcons as Record<string, unknown>)[name];
  if (!comp) return null;
  return createElement(comp as React.ElementType, {
    size,
    strokeWidth,
    className,
  });
}
