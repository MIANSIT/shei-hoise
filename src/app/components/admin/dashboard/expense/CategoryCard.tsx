"use client";

import { FC, SVGProps } from "react";
import { Button, Tooltip, Tag } from "antd";
import { EditOutlined, DeleteOutlined, FolderOutlined } from "@ant-design/icons";
import * as LucideIcons from "lucide-react";
import { ExpenseCategory } from "@/lib/types/expense/expense";

const toPascalCase = (str: string) =>
  str.replace(/(^\w|-\w)/g, (m) => m.replace("-", "").toUpperCase());

interface CategoryCardProps {
  cat: ExpenseCategory;
  onEdit: (cat: ExpenseCategory) => void;
  onDelete: (cat: ExpenseCategory) => void;
}

export function CategoryCard({ cat, onEdit, onDelete }: CategoryCardProps) {
  const iconName = cat.icon ? toPascalCase(cat.icon) : "";
  const DynamicIcon =
    iconName &&
    (LucideIcons as unknown as Record<string, FC<SVGProps<SVGSVGElement>>>)[iconName]
      ? (LucideIcons as unknown as Record<string, FC<SVGProps<SVGSVGElement>>>)[iconName]
      : null;

  const accentColor = cat.color || "#1a1a1a";

  return (
    <div
      className={`group relative bg-background rounded-2xl border border-ring shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col ${
        !cat.is_active ? "opacity-60" : ""
      }`}
    >
      {/* Top accent bar */}
      <div className="h-1 w-full" style={{ background: accentColor }} />

      <div className="p-5 flex flex-col flex-1">
        {/* Icon + Status */}
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-primary text-lg shadow-sm"
            style={{ background: accentColor }}
          >
            {DynamicIcon ? (
              <DynamicIcon className="w-5 h-5" style={{ color: "white" }} />
            ) : (
              <FolderOutlined style={{ color: "white" }} />
            )}
          </div>

          <div className="flex gap-1.5 items-center">
            {cat.is_default && (
              <Tag
                color="gold"
                className="text-xs rounded-full border-0 px-2"
                style={{ fontFamily: "inherit" }}
              >
                Default
              </Tag>
            )}
            {!cat.is_active && (
              <Tag
                color="red"
                className="text-xs rounded-full border-0 px-2"
                style={{ fontFamily: "inherit" }}
              >
                Inactive
              </Tag>
            )}
          </div>
        </div>

        {/* Name + Description */}
        <div className="flex-1">
          <h3 className="font-bold text-ring text-base leading-snug mb-1">
            {cat.name}
          </h3>
          {cat.description && (
            <p className="text-sm text-primary leading-snug line-clamp-2">
              {cat.description}
            </p>
          )}
        </div>

        {/* Actions */}
        {!cat.is_default && (
          <div className="mt-4 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Tooltip title="Edit">
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => onEdit(cat)}
                className="rounded-lg border-ring text-ring hover:text-primary"
              />
            </Tooltip>
            <Tooltip title="Delete">
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => onDelete(cat)}
                className="rounded-lg"
              />
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
}