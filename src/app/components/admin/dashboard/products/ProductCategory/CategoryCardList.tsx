"use client";

import React from "react";
import { Popconfirm, Tooltip } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { Category } from "@/lib/types/category";

interface CategoryCardListProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onToggleActive: (category: Category, isActive: boolean) => void;
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full
                  transition-colors duration-300
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/30
                  ${checked ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow
                    transition-transform duration-300
                    ${checked ? "translate-x-4" : "translate-x-0.5"}`}
      />
    </button>
  );
}

const CategoryCard: React.FC<{
  category: Category;
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
  onToggleActive: (c: Category, v: boolean) => void;
}> = ({ category, onEdit, onDelete, onToggleActive }) => (
  <div
    className="bg-white dark:bg-[#16181f]
                  border border-gray-200 dark:border-[#2a2d3a]
                  rounded-xl sm:rounded-2xl
                  p-3 sm:p-4
                  transition-all duration-200
                  hover:border-gray-300 dark:hover:border-[#3a3d4a]
                  hover:shadow-sm"
  >
    {/* ── Top row ── */}
    <div className="flex items-start justify-between gap-2 mb-2">
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate leading-snug">
          {category.name}
        </h3>
        <span
          className="inline-block font-mono text-[10px] sm:text-[11px] mt-0.5
                         px-1.5 sm:px-2 py-0.5 rounded-md
                         bg-gray-100 dark:bg-[#0f1117]
                         text-gray-400
                         border border-gray-200 dark:border-[#2a2d3a]
                         max-w-full truncate"
        >
          {category.slug}
        </span>
      </div>

      {/* Status badge */}
      <span
        className={`shrink-0 text-[10px] sm:text-xs font-medium
                        px-2 py-0.5 rounded-full whitespace-nowrap
                        ${
                          category.is_active
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-gray-100 dark:bg-gray-700/30 text-gray-400"
                        }`}
      >
        {category.is_active ? "Active" : "Inactive"}
      </span>
    </div>

    {/* ── Description ── */}
    {category.description && (
      <p className="text-xs text-gray-400 mb-2.5 sm:mb-3 line-clamp-2 leading-relaxed">
        {category.description}
      </p>
    )}

    {/* ── Bottom row ── */}
    <div
      className="flex items-center justify-between
                    pt-2.5 sm:pt-3
                    border-t border-gray-100 dark:border-[#2a2d3a]"
    >
      <div className="flex items-center gap-2">
        <ToggleSwitch
          checked={category.is_active}
          onChange={(checked) => onToggleActive(category, checked)}
        />
        <span className="text-[10px] sm:text-xs text-gray-400 tabular-nums">
          {category.createdAt}
        </span>
      </div>

      <div className="flex items-center gap-1 sm:gap-1.5">
        <Tooltip title="Edit">
          <button
            onClick={() => onEdit(category)}
            className="w-7 h-7 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg
                       border border-gray-200 dark:border-[#2a2d3a]
                       text-gray-400 hover:text-indigo-500
                       hover:border-indigo-300 dark:hover:border-indigo-600
                       hover:bg-indigo-50 dark:hover:bg-indigo-500/10
                       transition-all duration-150"
          >
            <EditOutlined style={{ fontSize: 11 }} />
          </button>
        </Tooltip>

        <Popconfirm
          title={
            <span className="text-sm font-medium">Delete this category?</span>
          }
          description={
            <span className="text-xs text-gray-400">
              This cannot be undone.
            </span>
          }
          onConfirm={() => onDelete(category)}
          okText="Delete"
          okButtonProps={{ danger: true }}
          cancelText="Cancel"
          placement="topRight"
        >
          <Tooltip title="Delete">
            <button
              className="w-7 h-7 flex items-center justify-center rounded-lg
                               border border-red-200 dark:border-red-500/20
                               text-red-400 hover:text-red-500
                               hover:bg-red-50 dark:hover:bg-red-500/10
                               transition-all duration-150"
            >
              <DeleteOutlined style={{ fontSize: 11 }} />
            </button>
          </Tooltip>
        </Popconfirm>
      </div>
    </div>
  </div>
);

const CategoryCardList: React.FC<CategoryCardListProps> = ({
  categories,
  onEdit,
  onDelete,
  onToggleActive,
}) => {
  if (categories.length === 0) {
    return (
      <div
        className="w-full flex flex-col items-center justify-center py-12 sm:py-16 text-center
                      bg-white dark:bg-[#16181f]
                      border border-gray-200 dark:border-[#2a2d3a]
                      rounded-2xl"
      >
        <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">🗂️</div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          No categories found
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Try adjusting your search or filters
        </p>
      </div>
    );
  }

  return (
    /*
      xs–sm  → single column
      md–lg  → 2-column grid (tablet landscape)
      (lg+ shows the table instead, so this never renders on desktop)
    */
    <div className="w-full grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-3">
      {categories.map((category) => (
        <CategoryCard
          key={category.id}
          category={category}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleActive={onToggleActive}
        />
      ))}
    </div>
  );
};

export default CategoryCardList;
