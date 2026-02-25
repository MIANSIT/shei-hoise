import type { ForwardRefExoticComponent, RefAttributes } from "react";
import type { LucideProps } from "lucide-react";
import {
  Tag,
  Receipt,
  Store,
  CreditCard,
  FileText,
  Wallet,
  TrendingUp,
  LayoutGrid,
  Plus,
  ReceiptText,
  ShoppingCart,
  Utensils,
  Car,
  Home,
  Briefcase,
  Heart,
  Zap,
  Package,
  Wrench,
  Laptop,
  Coffee,
  Plane,
  Phone,
  Book,
  Music,
  Shirt,
  Pill,
  Dumbbell,
  GraduationCap,
  Building,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LucideIcon = ForwardRefExoticComponent<
  LucideProps & RefAttributes<SVGSVGElement>
>;

// ─── Icon map ─────────────────────────────────────────────────────────────────

export const LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
  Tag,
  Receipt,
  Store,
  CreditCard,
  FileText,
  Wallet,
  TrendingUp,
  LayoutGrid,
  Plus,
  ReceiptText,
  ShoppingCart,
  Utensils,
  Car,
  Home,
  Briefcase,
  Heart,
  Zap,
  Package,
  Wrench,
  Laptop,
  Coffee,
  Plane,
  Phone,
  Book,
  Music,
  Shirt,
  Pill,
  Dumbbell,
  GraduationCap,
  Building,
};

// ─── Color palette ────────────────────────────────────────────────────────────

const COLOR_PALETTE: readonly string[] = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#ef4444",
  "#14b8a6",
  "#f97316",
  "#84cc16",
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getCategoryColor(category: {
  id: string;
  color?: string | null;
  name: string;
}): string {
  if (category.color) return category.color;

  let hash = 0;
  for (let i = 0; i < category.id.length; i++) {
    hash = category.id.charCodeAt(i) + ((hash << 5) - hash);
  }

  return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length];
}

export function hexToRgba(hex: string, alpha: number): string {
  const sanitized = hex.replace(/^#/, "");

  if (!/^[0-9a-fA-F]{6}$/.test(sanitized)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[hexToRgba] Invalid hex color: "${hex}"`);
    }
    return `rgba(0,0,0,${alpha})`;
  }

  const r = parseInt(sanitized.slice(0, 2), 16);
  const g = parseInt(sanitized.slice(2, 4), 16);
  const b = parseInt(sanitized.slice(4, 6), 16);

  return `rgba(${r},${g},${b},${alpha})`;
}
