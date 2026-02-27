"use client";

import { memo } from "react";
import { Tag } from "lucide-react";
import { LUCIDE_ICON_MAP } from "@/lib/types/expense/expense-utils";

interface DynamicLucideIconProps {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

function DynamicLucideIcon({
  name,
  size = 13,
  color = "currentColor",
  strokeWidth = 2,
}: DynamicLucideIconProps) {
  const cleanName = name?.replace(/^Lucide/, "").trim() || "Tag";
  const Icon = LUCIDE_ICON_MAP[cleanName] ?? Tag;
  return <Icon size={size} color={color} strokeWidth={strokeWidth} />;
}

export default memo(DynamicLucideIcon);
