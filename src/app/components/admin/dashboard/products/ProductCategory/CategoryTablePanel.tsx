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
  onToggleActive: (category: Category, isActive: boolean) => void; // ✅ keep
}

export default function CategoryTablePanel({
  categories,
  loading,
  onEdit,
  onDelete,
  showForm,
  onToggleActive, // ✅ add this here
}: CategoryTablePanelProps) {
  return (
    <div className={`${showForm ? "lg:w-2/3 w-full" : "w-full"}`}>
      <CategoryTable
        data={categories}
        loading={loading}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleActive={onToggleActive} // ✅ now it's defined
      />
    </div>
  );
}
