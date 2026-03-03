"use client";

import React from "react";
import CategoryTable from "@/app/components/admin/dashboard/products/ProductCategory/CategoryTable";
import type { Category } from "@/lib/types/category";

interface CategoryTablePanelProps {
  categories: Category[];
  loading: boolean;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  showForm: boolean;
  onToggleActive: (category: Category, isActive: boolean) => void;
}

export default function CategoryTablePanel({
  categories,
  loading,
  onEdit,
  onDelete,
  showForm,
  onToggleActive,
}: CategoryTablePanelProps) {
  return (
    /*
      When the form panel is visible beside the table:
        - lg:  table takes 2/3 width
        - xl+: table fills remaining space (flex-1) next to the fixed-width form
      When form is hidden: full width always.
    */
    <div
      className={`min-w-0 transition-all duration-300
        ${showForm ? "w-full lg:flex-1" : "w-full"}`}
    >
      <CategoryTable
        data={categories}
        loading={loading}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleActive={onToggleActive}
      />
    </div>
  );
}
