"use client";

import { FC, SVGProps } from "react";
import { Button, Tooltip, Tag } from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  FolderOutlined,
} from "@ant-design/icons";
import * as LucideIcons from "lucide-react";
import { ExpenseCategory } from "@/lib/types/expense/type";

const toPascalCase = (str: string) =>
  str.replace(/(^\w|-\w)/g, (m) => m.replace("-", "").toUpperCase());

interface CategoryCardProps {
  cat: ExpenseCategory;
  onEdit: (cat: ExpenseCategory) => void;
  onDelete: (cat: ExpenseCategory) => void;
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : "102, 126, 234";
}

export function CategoryCard({ cat, onEdit, onDelete }: CategoryCardProps) {
  const iconName = cat.icon ? toPascalCase(cat.icon) : "";
  const DynamicIcon =
    iconName &&
    (LucideIcons as unknown as Record<string, FC<SVGProps<SVGSVGElement>>>)[
      iconName
    ]
      ? (LucideIcons as unknown as Record<string, FC<SVGProps<SVGSVGElement>>>)[
          iconName
        ]
      : null;

  const accentColor = cat.color || "#667eea";
  const rgb = hexToRgb(accentColor);

  return (
    <div
      className={`group relative rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col ${
        !cat.is_active ? "opacity-60" : ""
      }`}
      style={{
        background: `linear-gradient(145deg, rgba(${rgb}, 0.08) 0%, rgba(${rgb}, 0.03) 100%)`,
        border: `1.5px solid rgba(${rgb}, 0.25)`,
      }}
    >
      {/* Top accent bar */}
      <div className="h-1 w-full" style={{ background: accentColor }} />

      <div className="p-5 flex flex-col flex-1">
        {/* Icon + Status */}
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm"
            style={{
              background: `linear-gradient(135deg, rgba(${rgb}, 0.2), rgba(${rgb}, 0.35))`,
              border: `1.5px solid rgba(${rgb}, 0.3)`,
            }}
          >
            {DynamicIcon ? (
              <DynamicIcon className="w-5 h-5" style={{ color: accentColor }} />
            ) : (
              <FolderOutlined style={{ color: accentColor, fontSize: 18 }} />
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
          <h3 className="font-bold text-gray-900 dark:text-white text-base leading-snug mb-1">
            {cat.name}
          </h3>
          {cat.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-snug line-clamp-2">
              {cat.description}
            </p>
          )}
        </div>

        {/* Actions */}
        {!cat.is_default && (
          <div className="mt-4 flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
            <Tooltip title="Edit">
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => onEdit(cat)}
                className="rounded-lg"
                style={{
                  borderColor: `rgba(${rgb}, 0.4)`,
                  color: accentColor,
                }}
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
