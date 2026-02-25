"use client";

import { FolderOpen } from "lucide-react";
import { ICON_NAMES, IconByName } from "./IconbyName";

interface CategoryPreviewProps {
  name: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  color: string;
}

export function CategoryPreview({
  name,
  description,
  icon,
  isActive,
  color,
}: CategoryPreviewProps) {
  const hasName = !!name?.trim();

  return (
    <div
      className="rounded-2xl overflow-hidden border transition-all duration-300"
      style={{ borderColor: `${color}35` }}
    >
      {/* Color bar */}
      <div className="h-1 w-full transition-all duration-500" style={{ background: color }} />

      {/* Body */}
      <div
        className="p-4 transition-all duration-300"
        style={{ background: `${color}0d` }}
      >
        <p
          className="text-[9px] uppercase tracking-[0.15em] font-bold mb-3"
          style={{ color }}
        >
          Live Preview
        </p>

        <div className="flex items-center gap-3.5">
          {/* Icon badge */}
          <div
            className="flex items-center justify-center rounded-2xl shrink-0 transition-all duration-300"
            style={{
              width: 52,
              height: 52,
              background: color,
              boxShadow: `0 4px 20px ${color}50`,
            }}
          >
            {icon && ICON_NAMES.includes(icon) ? (
              <IconByName name={icon} size={26} strokeWidth={1.75} className="text-white" />
            ) : (
              <FolderOpen size={24} className="text-white" strokeWidth={1.5} />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className={`font-bold text-sm leading-tight truncate transition-all ${
                  hasName ? "text-gray-800 dark:text-zinc-100" : "text-gray-300 dark:text-zinc-600"
                }`}
              >
                {hasName ? name : "Category Name"}
              </span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 transition-all"
                style={
                  isActive
                    ? { background: "#dcfce7", color: "#15803d" }
                    : { background: "#f3f4f6", color: "#9ca3af" }
                }
              >
                {isActive ? "Active" : "Inactive"}
              </span>
            </div>

            <p
              className={`text-xs leading-relaxed line-clamp-2 transition-all ${
                description?.trim()
                  ? "text-gray-500 dark:text-zinc-400"
                  : "text-gray-300 dark:text-zinc-600 italic"
              }`}
            >
              {description?.trim() || (hasName ? "Add a description…" : "No description")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}